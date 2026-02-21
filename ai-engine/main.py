"""
main.py — AegisGrid AI Engine FastAPI Server
=============================================
Exposes the DDPG-driven microgrid simulation via:

  REST
    GET  /health           → liveness probe
    GET  /state            → current SimState snapshot
    POST /step             → advance one sim tick manually
    POST /chaos/{event}    → inject chaos (cloud_cover | peak_demand |
                                            malicious_actor | delivery_fail)
    POST /chaos/reset      → clear all chaos modifiers
    GET  /nodes            → per-node telemetry
    GET  /market-state     → AMM reserve snapshot

  WebSocket
    WS   /ws              → streams SimState JSON every 500ms
                            consumed by Node.js gateway & frontend

  SimState schema (also returned by /step):
    {
      "timestamp":     int,       // unix ms
      "gridLoad":      float,     // kW
      "generation":    float,     // kW
      "gridImbalance": float,     // kW  (positive = surplus)
      "energyReserve": float,     // kWh in AMM pool
      "stableReserve": float,     // USDC in AMM pool
      "price":         float,     // USDC / kWh
      "swapFee":       float,     // percentage e.g. 1.34
      "reward":        float,     // DDPG reward this tick
      "ddpgActive":    bool,
      "step":          int,
      "events":        list       // chaos / slash events
    }
"""

from __future__ import annotations

import asyncio
import time
import threading
from typing import Any

import numpy as np
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from aegis_env import AegisEnv
from ddpg_agent import DDPGAgent

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(title="AegisGrid AI Engine", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Shared simulation state ────────────────────────────────────────────────────
env   = AegisEnv()
agent = DDPGAgent()

_obs, _  = env.reset()           # initial 7-dim observation
_last_state: dict[str, Any] = {} # filled on first tick
_step_count = 0
_lock = threading.Lock()         # guards _obs / _last_state across threads

TICK_INTERVAL = 0.5              # seconds between simulation steps (500ms)
TRAIN_EVERY   = 20               # DDPG update every N ticks

# ── WebSocket client registry ─────────────────────────────────────────────────
_ws_clients: set[WebSocket] = set()


# ══════════════════════════════════════════════════════════════════════════════
# PYDANTIC SCHEMA
# ══════════════════════════════════════════════════════════════════════════════
class SimState(BaseModel):
    timestamp:     int
    gridLoad:      float
    generation:    float
    gridImbalance: float
    energyReserve: float
    stableReserve: float
    price:         float
    swapFee:       float
    reward:        float
    ddpgActive:    bool
    step:          int
    events:        list

class ChaosRequest(BaseModel):
    type: str   # "cloud_cover" | "peak_demand" | "malicious_actor" | "delivery_fail"


# ══════════════════════════════════════════════════════════════════════════════
# SIMULATION LOOP  (runs in background asyncio task)
# ══════════════════════════════════════════════════════════════════════════════
def _build_state(info: dict, fee: float, reward: float) -> dict:
    return {
        "timestamp":     int(time.time() * 1000),
        "gridLoad":      round(info["gridLoad"],      2),
        "generation":    round(info["generation"],    2),
        "gridImbalance": round(info["gridImbalance"], 2),
        "energyReserve": round(info["energyReserve"], 1),
        "stableReserve": round(info["stableReserve"], 1),
        "price":         round(info["price"],         6),
        "swapFee":       round(fee * 100,             3),  # store as %
        "reward":        reward,
        "ddpgActive":    True,
        "step":          _step_count,
        "events":        info.get("slashEvents", []),
    }


async def _simulation_loop():
    """
    Core 500ms tick loop.
    1. DDPG selects swap fee from 7-dim observation
    2. AegisEnv steps forward one 30-min simulation timestep
    3. Experience stored; DDPG trained every TRAIN_EVERY steps
    4. SimState broadcast to all WebSocket clients
    """
    global _obs, _last_state, _step_count

    while True:
        start = asyncio.get_event_loop().time()

        with _lock:
            # 1. DDPG → action (fee in [0.001, 0.05])
            fee = agent.select_action(_obs, explore=True)

            # 2. Environment step
            next_obs, reward, terminated, truncated, info = env.step(
                np.array([fee], dtype=np.float32)
            )

            # 3. Store experience
            agent.store(_obs, fee, reward, next_obs, float(terminated or truncated))
            _obs = next_obs
            _step_count += 1

            # 4. Periodic DDPG training (non-blocking in same thread)
            if _step_count % TRAIN_EVERY == 0:
                agent.update()

            # 5. Episode reset
            if terminated or truncated:
                _obs, _ = env.reset()

            # 6. Build state dict
            _last_state = _build_state(info, fee, reward)

        # 7. Broadcast to WebSocket clients
        if _ws_clients:
            import json
            payload = json.dumps(_last_state)
            dead: set[WebSocket] = set()
            for ws in list(_ws_clients):
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead.add(ws)
            _ws_clients.difference_update(dead)

        # Sleep for remainder of 500ms interval
        elapsed = asyncio.get_event_loop().time() - start
        await asyncio.sleep(max(0.0, TICK_INTERVAL - elapsed))


@app.on_event("startup")
async def startup():
    asyncio.create_task(_simulation_loop())
    print("✅ AegisGrid AI Engine started — simulation loop running at 500ms ticks")


# ══════════════════════════════════════════════════════════════════════════════
# REST ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/health")
def health():
    return {"status": "ok", "engine": "AegisGrid v2.0", "step": _step_count}


@app.get("/state", response_model=SimState)
def get_state():
    """Current SimState snapshot (latest tick)."""
    if not _last_state:
        raise HTTPException(status_code=503, detail="Simulation not started yet")
    return _last_state


@app.post("/step", response_model=SimState)
def manual_step():
    """
    Manually advance the simulation by one step.
    Useful for testing without waiting for the 500ms loop.
    """
    global _obs, _last_state, _step_count

    with _lock:
        fee = agent.select_action(_obs, explore=False)
        next_obs, reward, terminated, truncated, info = env.step(
            np.array([fee], dtype=np.float32)
        )
        agent.store(_obs, fee, reward, next_obs, float(terminated or truncated))
        _obs = next_obs
        _step_count += 1
        if terminated or truncated:
            _obs, _ = env.reset()
        _last_state = _build_state(info, fee, reward)

    return _last_state


@app.post("/chaos/{event}")
def inject_chaos(event: str):
    """
    Inject a chaos event. Supported events:
      - cloud_cover       → solar generation −40%
      - peak_demand       → grid load +60%
      - malicious_actor   → random node under-reports generation
      - delivery_fail     → random node flagged for slashing
    """
    _map = {
        "cloud_cover":     env.simulate_cloud_cover,
        "peak_demand":     env.simulate_peak_demand,
        "malicious_actor": env.inject_malicious_actor,
        "delivery_fail":   env.simulate_delivery_failure,
    }
    if event not in _map:
        raise HTTPException(status_code=400,
            detail=f"Unknown event '{event}'. Valid: {list(_map)}")
    _map[event]()
    return {"status": "injected", "event": event}


@app.post("/chaos/reset")
def reset_chaos():
    env.reset_chaos()
    return {"status": "chaos cleared"}


@app.get("/nodes")
def get_nodes():
    """Per-node telemetry (generation, load, SoC) for the 15 prosumer nodes."""
    return {
        "nodes": env.physics.nodes,
        "hour":  env.physics.current_hour,
    }


@app.get("/market-state")
def market_state():
    """Full AMM reserve snapshot."""
    return {
        "energyReserve": round(env._amm_x, 1),
        "stableReserve": round(env._amm_y, 1),
        "swapFee":       round(_last_state.get("swapFee", 1.34), 3),
        "k":             round(env._amm_x * env._amm_y, 0),
        "spotPrice":     round(env._amm_y / max(env._amm_x, 1), 6),
    }


# ══════════════════════════════════════════════════════════════════════════════
# WEBSOCKET STREAM   /ws
# ══════════════════════════════════════════════════════════════════════════════
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """
    Bi-directional WebSocket stream.
    Server pushes SimState JSON every 500ms.
    Client can send chaos commands:
      {"event": "cloud_cover"}   etc.
    """
    await ws.accept()
    _ws_clients.add(ws)
    print(f"[WS] Client connected — total: {len(_ws_clients)}")
    try:
        while True:
            try:
                # Listen for chaos commands from the client (non-blocking)
                data = await asyncio.wait_for(ws.receive_json(), timeout=0.05)
                event = data.get("event", "")
                if event:
                    try:
                        inject_chaos(event)
                    except HTTPException:
                        pass
            except asyncio.TimeoutError:
                pass   # no message from client — normal
    except WebSocketDisconnect:
        _ws_clients.discard(ws)
        print(f"[WS] Client disconnected — total: {len(_ws_clients)}")


# ── Dev runner ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
