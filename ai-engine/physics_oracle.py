import os
import numpy as np
import math
import time
import json
from web3 import Web3


class AegisGridPhysics:
    """Deterministic simulation of a microgrid's daily energy cycle."""

    def __init__(self, num_nodes=15, battery_capacity_kwh=13.5):
        self.num_nodes = num_nodes
        # Initialize 15 nodes with randomized, realistic base specs
        self.nodes = [{
            "id": f"0xNode_{i}",
            "base_load": np.random.uniform(1.0, 2.5),       # kW average load
            "solar_capacity": np.random.uniform(4.0, 8.0),  # kW peak generation
            "battery_soc": 50.0,                            # 50% State of Charge
            "battery_capacity": battery_capacity_kwh
        } for i in range(num_nodes)]
        self.current_hour = 0.0

        # Chaos flags
        self._chaos_cloud = False        # cloud cover → solar −40%
        self._chaos_peak = False         # peak demand → load +60%
        self._chaos_malicious = None     # index of malicious node (or None)
        self._slashed_nodes: set = set()

    # ── Solar & Load Models ──────────────────────────────────────────
    def get_solar_yield(self, hour, capacity):
        """Simulates the sun rising, peaking at noon, and setting."""
        if 6 <= hour <= 18:
            base = capacity * math.sin(math.pi * (hour - 6) / 12)
            if self._chaos_cloud:
                base *= 0.60          # cloud cover: −40%
            return base
        return 0.0

    def get_duck_curve_load(self, hour, base_load):
        """Simulates human behaviour: Morning routine and Evening peak."""
        morning_peak = 1.5 * math.exp(-0.5 * ((hour - 8) / 1.5) ** 2)
        evening_peak = 3.0 * math.exp(-0.5 * ((hour - 19) / 2.0) ** 2)
        load = base_load + morning_peak + evening_peak
        if self._chaos_peak:
            load *= 1.60              # peak demand: +60%
        return load

    # ── Chaos Injection API ─────────────────────────────────────────
    def inject_chaos(self, chaos_type: str):
        """Called by FastAPI endpoint to modify the running environment."""
        if chaos_type == "cloud_cover":
            self._chaos_cloud = True
        elif chaos_type == "peak_demand":
            self._chaos_peak = True
        elif chaos_type == "malicious_actor":
            # Pick a random node and flag it as hoarding energy
            self._chaos_malicious = np.random.randint(0, self.num_nodes)
        elif chaos_type == "delivery_fail":
            # Mark one node for slashing on next step
            victim = np.random.randint(0, self.num_nodes)
            self._slashed_nodes.add(victim)

    def reset_chaos(self):
        self._chaos_cloud = False
        self._chaos_peak = False
        self._chaos_malicious = None
        self._slashed_nodes.clear()

    # ── Simulation Step ─────────────────────────────────────────────
    def step(self, swap_fee: float = 1.34, energy_reserve: float = 5000.0,
             stable_reserve: float = 421.0):
        """Advances the simulation by 30 minutes and returns full grid state."""
        self.current_hour = (self.current_hour + 0.5) % 24

        total_gen = 0.0
        total_load = 0.0
        slash_events = []

        for i, node in enumerate(self.nodes):
            gen = max(0, self.get_solar_yield(self.current_hour, node["solar_capacity"])
                      + np.random.normal(0, 0.2))
            load = max(0, self.get_duck_curve_load(self.current_hour, node["base_load"])
                       + np.random.normal(0, 0.2))

            # Malicious node hoards: artificially suppresses reported generation
            if i == self._chaos_malicious:
                gen *= 0.1

            # Battery state machine
            net_energy = gen - load
            if net_energy > 0:
                charge_pct = net_energy * (100 / node["battery_capacity"])
                node["battery_soc"] = min(100.0, node["battery_soc"] + charge_pct)
            else:
                discharge_pct = abs(net_energy) * (100 / node["battery_capacity"])
                node["battery_soc"] = max(0.0, node["battery_soc"] - discharge_pct)

            # Slashing: delivery failure
            if i in self._slashed_nodes:
                penalty = round(np.random.uniform(10, 80), 2)
                slash_events.append({
                    "node": node["id"],
                    "penalty_usdc": penalty
                })
                self._slashed_nodes.discard(i)

            node["current_gen"] = round(gen, 2)
            node["current_load"] = round(load, 2)
            node["battery_soc"] = round(node["battery_soc"], 2)

            total_gen += gen
            total_load += load

        grid_imbalance = round(total_gen - total_load, 2)

        # AMM price from reserves (x·y = k)
        price = round(stable_reserve / energy_reserve, 6)

        # RL reward approximation (real DDPG agent overrides this in Phase 3)
        balance_norm = max(0.0, 1.0 - abs(grid_imbalance) / max(total_gen, 1))
        waste = max(0.0, grid_imbalance) / max(total_gen, 1)
        price_vol = abs(swap_fee - 1.34) / 4.9
        reward = round(0.6 * balance_norm - 0.2 * waste - 0.2 * price_vol, 4)

        # Drift AMM reserves slightly each tick
        energy_reserve = max(1000, energy_reserve + np.random.uniform(-12, 12))
        stable_reserve = max(100, stable_reserve + np.random.uniform(-5, 5))

        return {
            "hour": self.current_hour,
            "gridLoad": round(total_load, 2),
            "generation": round(total_gen, 2),
            "price": price,
            "swapFee": round(swap_fee, 3),
            "energyReserve": round(energy_reserve, 1),
            "stableReserve": round(stable_reserve, 1),
            "reward": reward,
            "gridImbalance": grid_imbalance,
            "nodes": self.nodes,
            "slashEvents": slash_events,
        }


class OracleBridge:
    """
    Web3 interface connecting the Python physics to the deployed Solidity AMM.

    Phase 2 upgrade:
      - Auto-loads deployment.json written by deploy.js
      - Binds to live EnergyToken + AegisAMM contracts
      - Oracle wallet = Hardhat account index 1 (pre-funded with 10 000 ETH)
      - Exposes update_swap_fee() for DDPG agent to call on-chain
      - Exposes flag_delivery_failure() for slashing
    """

    def __init__(self, rpc_url="http://127.0.0.1:8545"):
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.amm_contract = None
        self.token_contract = None
        self.oracle_wallet = None

        if not self.w3.is_connected():
            print("[WARN] Web3 Not Connected. Running in simulation-only mode.")
            print("    Start Hardhat: cd blockchain && npx hardhat node")
            return

        print(f"✅ Web3 Connected. Block Height: {self.w3.eth.block_number}")

        # ── Auto-load from deployment.json (written by deploy.js) ─────
        deployment_path = os.path.join(os.path.dirname(__file__), "deployment.json")
        if not os.path.exists(deployment_path):
            print("[WARN] deployment.json not found. Run: cd blockchain && npx hardhat run scripts/deploy.js --network localhost")
            return

        with open(deployment_path, "r") as f:
            deploy_info = json.load(f)

        amm_address   = deploy_info["contracts"]["AegisAMM"]
        token_address = deploy_info["contracts"]["EnergyToken"]
        self.oracle_wallet = deploy_info["wallets"]["oracle"]

        # ── Load ABI from Hardhat artifacts ───────────────────────────
        artifacts_base = os.path.join(
            os.path.dirname(__file__), "..", "blockchain", "artifacts", "contracts"
        )
        amm_artifact_path   = os.path.join(artifacts_base, "AegisAMM.sol",   "AegisAMM.json")
        token_artifact_path = os.path.join(artifacts_base, "EnergyToken.sol","EnergyToken.json")

        try:
            with open(amm_artifact_path, "r") as f:
                amm_abi = json.load(f)["abi"]
            with open(token_artifact_path, "r") as f:
                token_abi = json.load(f)["abi"]
        except FileNotFoundError as e:
            print(f"[WARN] ABI file not found: {e}")
            print("    Run: cd blockchain && npx hardhat compile")
            return

        self.amm_contract = self.w3.eth.contract(
            address=self.w3.to_checksum_address(amm_address), abi=amm_abi
        )
        self.token_contract = self.w3.eth.contract(
            address=self.w3.to_checksum_address(token_address), abi=token_abi
        )

        print(f"✅ AMM Contract Successfully Mapped via ABI.")
        print(f"   AegisAMM   → {amm_address}")
        print(f"   EnergyToken→ {token_address}")
        print(f"   Oracle     → {self.oracle_wallet}")

        # ── Verify on-chain pool state ────────────────────────────────
        try:
            x = self.amm_contract.functions.energyReserve().call()
            y = self.amm_contract.functions.stableReserve().call()
            fee = self.amm_contract.functions.swapFeeBPS().call()
            print(f"   Pool: x={x} kWh | y={y} USDC | fee={fee/100:.2f}%")
        except Exception as e:
            print(f"   [WARN] Pool read failed: {e}")

    # ── On-chain write: DDPG fee update ──────────────────────────────
    def update_swap_fee(self, new_fee_pct: float):
        """
        Called by the DDPG agent every tick to push fee adjustment on-chain.
        new_fee_pct: float in [0.1, 5.0]  e.g. 1.34
        """
        if not self.amm_contract or not self.oracle_wallet:
            return  # graceful no-op in simulation-only mode

        fee_bps = max(10, min(500, int(new_fee_pct * 100)))  # clamp to [10, 500]
        try:
            tx_hash = self.amm_contract.functions.updateSwapFee(fee_bps).transact(
                {"from": self.oracle_wallet, "gas": 100_000}
            )
            self.w3.eth.wait_for_transaction_receipt(tx_hash)
            print(f"[CHAIN] Swap fee updated → {fee_bps/100:.2f}% | tx: {tx_hash.hex()[:16]}…")
        except Exception as e:
            print(f"[CHAIN] updateSwapFee failed: {e}")

    # ── On-chain write: slash delivery failure ────────────────────────
    def flag_delivery_failure(self, node_address: str):
        """
        Oracle flags a node for slashing after a failed delivery.
        Triggers slashBadActor() on the AMM in the next step.
        """
        if not self.token_contract or not self.oracle_wallet:
            return
        try:
            tx_hash = self.token_contract.functions.flagDeliveryFailure(
                self.w3.to_checksum_address(node_address)
            ).transact({"from": self.oracle_wallet, "gas": 80_000})
            self.w3.eth.wait_for_transaction_receipt(tx_hash)
            print(f"[CHAIN] Delivery failure flagged for {node_address[:10]}…")
        except Exception as e:
            print(f"[CHAIN] flagDeliveryFailure failed: {e}")

    # ── Off-chain log ─────────────────────────────────────────────────
    def push_telemetry(self, state_data):
        """Log oracle state to console (and push on-chain swap fee if connected)."""
        hour = state_data['hour']
        time_str = f"{int(hour):02d}:{'30' if hour % 1 else '00'}"
        imbalance = state_data['gridImbalance']
        status = "🟢 SURPLUS" if imbalance >= 0 else "🔴 DEFICIT"
        print(
            f"[ORACLE] Time: {time_str} | "
            f"Grid Status: {status} | "
            f"Net Imbalance: {imbalance} kW | "
            f"Gen: {state_data['generation']} kW | "
            f"Load: {state_data['gridLoad']} kW"
        )
        # Push DDPG fee change on-chain (Phase 2+)
        self.update_swap_fee(state_data['swapFee'])



# ══════════════════════════════════════════════════════════════════════════════
# PHASE 3: RL ENVIRONMENT — CSV-driven with Proportional Microgrid Scaling
# ══════════════════════════════════════════════════════════════════════════════
import pandas as pd


class AegisGridEnv:
    """
    Gymnasium-style RL environment for the DDPG agent.

    Proportional Microgrid Scaling:
      Instead of using raw kW values (solar: 27,741 kW vs load: 6.85 kW),
      we use the pre-computed normalized columns from aegis_training_data.csv
      and scale each node independently with realistic per-house constants:
        node_solar_kw = solar_norm * SOLAR_PEAK_KW  (max 8 kW per house)
        node_load_kw  = load_norm  * LOAD_PEAK_KW   (max 5 kW per house)
      Gaussian noise adds realistic variance across the 15 nodes.

    State vector (returned by reset/step):
      s = [net_imbalance_norm, aggregate_soc_norm, spot_price_norm]
      All components ∈ [-1, 1] or [0, 1] for stable NN inputs.

    Action:
      a ∈ [0, 1]  →  maps to AMM swap fee [10, 1000] basis points.
      The action modulates the spot price (higher fee = fewer swaps = tighter reserve).
    """

    # ── Microgrid constants ──────────────────────────────────────────
    NUM_NODES         = 15
    SOLAR_PEAK_KW     = 8.0          # max solar per house
    LOAD_PEAK_KW      = 5.0          # max load per house
    BATTERY_CAP_KWH   = 13.5         # per-node Tesla Powerwall equivalent
    NOISE_STD         = 0.05         # Gaussian spread across nodes (5%)

    # AMM reserve parameters (initial pool state from deploy.json)
    AMM_ENERGY_INIT   = 5_000.0      # kWh
    AMM_STABLE_INIT   = 421.0        # USDC

    # State normalization bounds
    IMBALANCE_SCALE   = NUM_NODES * max(SOLAR_PEAK_KW, LOAD_PEAK_KW)  # ~120 kW max swing
    SOC_MAX           = 100.0
    PRICE_MAX         = 2.0          # USDC / kWh ceiling for norm

    def __init__(self):
        data_path = os.path.join(os.path.dirname(__file__), "aegis_training_data.csv")
        if not os.path.exists(data_path):
            raise FileNotFoundError(
                "aegis_training_data.csv not found. Run preprocess_data.py first."
            )
        # ── Pre-load the entire CSV into a raw NumPy matrix ──────────
        # Eliminates pandas .iloc overhead (was the #1 hot-path inside step())
        df = pd.read_csv(data_path, index_col="timestamp", parse_dates=True)
        self._solar_norms = df['solar_norm'].to_numpy(dtype=np.float32)  # shape [T]
        self._load_norms  = df['load_norm'].to_numpy(dtype=np.float32)   # shape [T]
        self.n_rows       = len(self._solar_norms)
        self._row_idx     = 0

        # ── Vectorized node state: flat arrays of shape [N] ──────────
        # All per-node ops become single NumPy broadcast calls
        self._soc     = np.empty(self.NUM_NODES, dtype=np.float64)  # [N]
        self._bat_cap = np.empty(self.NUM_NODES, dtype=np.float64)  # [N]
        self._amm_x   = self.AMM_ENERGY_INIT
        self._amm_y   = self.AMM_STABLE_INIT
        self._reset_nodes()

        print(f"✅ AegisGridEnv loaded: {self.n_rows} timesteps "
              f"| {self.NUM_NODES} nodes "
              f"| solar≤{self.SOLAR_PEAK_KW}kW "
              f"| load≤{self.LOAD_PEAK_KW}kW per node [vectorized]")

    def _reset_nodes(self):
        """Randomise SoC and battery capacity for all nodes — single NumPy call."""
        self._soc[:]     = 50.0 + np.random.uniform(-10, 10, self.NUM_NODES)
        self._bat_cap[:] = self.BATTERY_CAP_KWH + np.random.uniform(-1.0, 1.0, self.NUM_NODES)

    # ── Public API (Gymnasium-compatible) ────────────────────────────
    def reset(self) -> np.ndarray:
        """Reset to beginning of dataset, randomise node SoC."""
        self._row_idx = 0
        self._amm_x   = self.AMM_ENERGY_INIT
        self._amm_y   = self.AMM_STABLE_INIT
        self._reset_nodes()
        return self._get_state()

    def step(self, action: float):
        """
        Advance one 30-minute timestep — fully vectorized NumPy path.
        No Python for-loop over nodes; all 15 nodes processed in 3 broadcast calls.
        """
        solar_norm = float(self._solar_norms[self._row_idx])
        load_norm  = float(self._load_norms[self._row_idx])

        # ── Vectorized Proportional Microgrid Scaling ─────────────────
        # gen  shape [N]: each node's solar output this timestep
        # load shape [N]: each node's consumption this timestep
        noise_solar = np.random.normal(0.0, self.NOISE_STD * self.SOLAR_PEAK_KW, self.NUM_NODES)
        noise_load  = np.random.normal(0.0, self.NOISE_STD * self.LOAD_PEAK_KW,  self.NUM_NODES)
        gen  = np.maximum(0.0, solar_norm * self.SOLAR_PEAK_KW + noise_solar)   # physics: ≥ 0
        load = np.maximum(0.2, load_norm  * self.LOAD_PEAK_KW  + noise_load)    # standby floor

        # ── Vectorized battery state machine ──────────────────────────
        net_kwh    = (gen - load) * 0.5                     # 30-min energy delta per node
        charge_pct = net_kwh * (100.0 / self._bat_cap)      # % of capacity, shape [N]
        np.clip(self._soc + charge_pct, 0.0, 100.0, out=self._soc)   # in-place, no temp alloc

        total_gen     = gen.sum()
        total_load    = load.sum()
        net_imbalance = total_gen - total_load
        aggregate_soc = self._soc.mean()

        # ── AMM spot price ────────────────────────────────────────────
        fee_bps = max(10, min(1000, int(action * 1000)))
        drift   = (action - 0.5) * 2.0
        self._amm_x = max(100.0, self._amm_x + drift * 10.0)
        spot_price  = self._amm_y / self._amm_x

        self._row_idx += 1
        done = self._row_idx >= self.n_rows
        next_state = self._build_state(net_imbalance, aggregate_soc, spot_price)

        info = {
            "net_imbalance":  round(float(net_imbalance), 3),
            "aggregate_soc":  round(float(aggregate_soc), 3),
            "spot_price":     round(spot_price, 6),
            "fee_bps":        fee_bps,
            "total_gen_kw":   round(float(total_gen),  2),
            "total_load_kw":  round(float(total_load), 2),
        }
        return next_state, done, info

    # ── State construction ───────────────────────────────────────────
    def _get_state(self) -> np.ndarray:
        imbalance = (float(self._solar_norms[0]) - float(self._load_norms[0])) * self.NUM_NODES * self.SOLAR_PEAK_KW
        soc       = float(self._soc.mean())
        price     = self._amm_y / self._amm_x
        return self._build_state(imbalance, soc, price)

    def _build_state(self, net_imbalance: float, aggregate_soc: float,
                     spot_price: float) -> np.ndarray:
        """
        Normalise all state components to roughly [-1, 1] / [0, 1].
        Stable inputs are the single most important factor for NN convergence.
        """
        s_imbalance = np.clip(net_imbalance / self.IMBALANCE_SCALE, -1.0, 1.0)
        s_soc       = aggregate_soc / self.SOC_MAX                          # [0, 1]
        s_price     = np.clip(spot_price    / self.PRICE_MAX, 0.0, 1.0)    # [0, 1]
        return np.array([s_imbalance, s_soc, s_price], dtype=np.float32)


# ── Standalone runner ────────────────────────────────────────────────
if __name__ == "__main__":
    print("Initializing AegisGrid Physics Engine (Phase 1 standalone test)...")
    physics = AegisGridPhysics()
    oracle = OracleBridge()

    print("\nStarting 24-Hour Simulation Loop (48 steps × 30 min)...\n")
    for _ in range(48):
        grid_state = physics.step()
        oracle.push_telemetry(grid_state)
        time.sleep(0.1)

    print("\n✅ Phase 1 simulation complete.")
    print("\n─── Phase 3 RL Environment Quick Check ───")
    env   = AegisGridEnv()
    state = env.reset()
    print(f"  Initial state: {state}")
    next_s, done, info = env.step(0.5)
    print(f"  After action=0.5 (500 bps): {info}")
    print(f"  Next state: {next_s}")

