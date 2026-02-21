"""
AegisGrid AI Engine — FastAPI Server (Port 8001)
Wraps the physics simulation and exposes HTTP endpoints consumed
by the Node.js gateway every 500 ms.

Phase 3 Final: Live DDPG Actor inference — trained brain controls AMM fee each tick.
"""

import os
import numpy as np
import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from physics_oracle import AegisGridPhysics, OracleBridge, AegisGridEnv
from ddpg_agent import Actor, DEVICE

# ── App Setup ────────────────────────────────────────────────────────
app = FastAPI(title="AegisGrid AI Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Shared Simulation State ─────────────────────────────────────────
physics = AegisGridPhysics(num_nodes=15)
oracle = OracleBridge()          # Web3 bridge (graceful no-op if Hardhat offline)

# Persistent AMM reserves carried between ticks
_amm = {"energyReserve": 5000.0, "stableReserve": 421.0, "swapFee": 1.34}

# ── Phase 3: Trained DDPG Actor (live inference) ────────────────────
# State norm constants must match AegisGridEnv so Actor sees same input distribution
_IMBALANCE_SCALE = AegisGridEnv.IMBALANCE_SCALE   # ~120 kW
_SOC_MAX         = AegisGridEnv.SOC_MAX           # 100.0
_PRICE_MAX       = AegisGridEnv.PRICE_MAX         # 2.0

_actor = None

def _load_actor():
    """Load trained Actor weights; graceful no-op if file missing."""
    global _actor
    if _actor is not None:
        return
    weights_path = os.path.join(os.path.dirname(__file__), "aegis_actor_weights.pth")
    if not os.path.exists(weights_path):
        print("[WARN] aegis_actor_weights.pth not found. Using fallback fee (1.34%).")
        return
    _actor = Actor(state_dim=3, action_dim=1).to(DEVICE)
    _actor.load_state_dict(torch.load(weights_path, map_location=DEVICE, weights_only=True))
    _actor.eval()
    print("✅ DDPG Actor loaded from aegis_actor_weights.pth (live fee control enabled).")

_load_actor()


# ── Request Schemas ─────────────────────────────────────────────────
class ChaosRequest(BaseModel):
    type: str   # "cloud_cover" | "peak_demand" | "malicious_actor" | "delivery_fail"

class SwapRequest(BaseModel):
    amountIn: float   # USDC in


# ── Endpoints ───────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "engine": "AegisGrid Physics v1.0"}


@app.get("/tick")
def tick():
    """
    Advance simulation by one 30-min step and return the current grid state.
    The Node.js gateway calls this every 500ms (time-compressed simulation).
    Phase 3: AI chooses swap fee from current state; we push it on-chain and use it next tick.
    """
    state = physics.step(
        swap_fee=_amm["swapFee"],
        energy_reserve=_amm["energyReserve"],
        stable_reserve=_amm["stableReserve"],
    )
    # Persist updated AMM reserves for the next tick
    _amm["energyReserve"] = state["energyReserve"]
    _amm["stableReserve"] = state["stableReserve"]

    # ── Phase 3: Live AI fee decision ───────────────────────────────
    net_imbalance = state["gridImbalance"]
    nodes = state.get("nodes", [])
    aggregate_soc = float(np.mean([n["battery_soc"] for n in nodes])) if nodes else 50.0
    spot_price = state["price"]

    # Normalise state same as training (AegisGridEnv._build_state)
    s_imbalance = np.clip(net_imbalance / _IMBALANCE_SCALE, -1.0, 1.0)
    s_soc = aggregate_soc / _SOC_MAX
    s_price = np.clip(spot_price / _PRICE_MAX, 0.0, 1.0)
    state_vec = np.array([s_imbalance, s_soc, s_price], dtype=np.float32)

    if _actor is not None:
        with torch.no_grad():
            state_tensor = torch.from_numpy(state_vec).unsqueeze(0).to(DEVICE)
            action = _actor(state_tensor)
            action_output = float(action.cpu().item())
        new_fee_bps = max(10, min(1000, int(action_output * 1000)))
        _amm["swapFee"] = new_fee_bps / 100.0
        state["swapFee"] = round(_amm["swapFee"], 3)
        print(f"[AI] fee → {new_fee_bps} bps ({_amm['swapFee']:.2f}%)")
    else:
        state["swapFee"] = round(_amm["swapFee"], 3)

    # Let oracle log telemetry (non-blocking, no Hardhat required)
    oracle.push_telemetry(state)

    # Keep nodes for Phase 5 3D canvas (real per-node data)
    # state.pop("nodes", None)  # removed — frontend needs nodes for MicrogridCanvas
    return state


@app.post("/chaos")
def inject_chaos(req: ChaosRequest):
    """
    Inject a chaos event into the live simulation.
    Called by the Node.js gateway when the frontend emits a chaos button click.
    """
    valid_types = {"cloud_cover", "peak_demand", "malicious_actor", "delivery_fail"}
    if req.type not in valid_types:
        return {"error": f"Unknown chaos type '{req.type}'"}
    physics.inject_chaos(req.type)
    return {"injected": req.type, "status": "active"}


@app.post("/chaos/reset")
def reset_chaos():
    """Reset all active chaos modifiers."""
    physics.reset_chaos()
    return {"status": "chaos cleared"}


@app.post("/swap")
def execute_swap(req: SwapRequest):
    """
    Simulate an AMM swap (USDC → kWh) using x·y = k.
    Phase 2 will replace this with an on-chain tx via web3.py.
    """
    x = _amm["energyReserve"]
    y = _amm["stableReserve"]
    fee_multiplier = 1 - _amm["swapFee"] / 100
    amount_in_after_fee = req.amountIn * fee_multiplier
    amount_out = (x * amount_in_after_fee) / (y + amount_in_after_fee)

    # Update reserves
    _amm["stableReserve"] += req.amountIn
    _amm["energyReserve"] -= amount_out

    tx_hash = "0x" + "%064x" % int(amount_out * 1e8)
    return {
        "amountIn": req.amountIn,
        "amountOut": round(amount_out, 4),
        "txHash": tx_hash,
        "newPrice": round(_amm["stableReserve"] / _amm["energyReserve"], 6),
    }


@app.get("/nodes")
def get_nodes():
    """Return current telemetry for all 15 prosumer nodes."""
    return {"nodes": physics.nodes, "hour": physics.current_hour}


@app.get("/market-state")
def market_state():
    """Full AMM reserve snapshot (mirrors the SDD REST endpoint)."""
    return {
        "energyReserve": _amm["energyReserve"],
        "stableReserve": _amm["stableReserve"],
        "swapFee": _amm["swapFee"],
        "k": _amm["energyReserve"] * _amm["stableReserve"],
        "spotPrice": round(_amm["stableReserve"] / _amm["energyReserve"], 6),
    }


# ── Dev runner ───────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
