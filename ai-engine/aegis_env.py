"""
aegis_env.py — Custom Gymnasium Environment for AegisGrid
==========================================================
AegisEnv wraps AegisGridPhysics into a proper gym.Env with:

  State Space  : 7-dim Box float32
    [0] grid_load_norm         — total load / 150 kW
    [1] generation_norm        — total generation / 150 kW
    [2] imbalance_norm         — (gen − load) / 150 kW  ∈ [-1, 1]
    [3] energy_reserve_norm    — AMM x reserve / 10000 kWh
    [4] stable_reserve_norm    — AMM y reserve / 1000 USDC
    [5] price_norm             — spot price / 2.0 USDC/kWh  ∈ [0, 1]
    [6] battery_soc_norm       — aggregate SoC / 100  ∈ [0, 1]

  Action Space : Box(1,) float32  →  swap_fee ∈ [0.001, 0.05]  (0.1% – 5.0%)

  Reward Function:
    R_t = (w1 * grid_balance) − (w2 * energy_waste) − (w3 * price_volatility)
    w1=1.0, w2=0.5, w3=0.3

Chaos Injection (callable at any time via FastAPI):
  simulate_cloud_cover()      — solar −40% for 1 episode step
  simulate_peak_demand()      — load  +60% for 1 episode step
  inject_malicious_actor()    — random node under-reports generation
  simulate_delivery_failure() — random node flagged for slashing
"""

import gymnasium as gym
from gymnasium import spaces
import numpy as np

from physics_oracle import AegisGridPhysics


# ── Reward weights (from SDD §3.1.4) ─────────────────────────────────────────
W1 = 1.0   # GridBalance  (maximise zero-imbalance)
W2 = 0.5   # EnergyWaste  (penalise excess generation unabsorbed)
W3 = 0.3   # PriceVolatility (penalise erratic fee / price swings)

# ── Normalisation ceilings ────────────────────────────────────────────────────
MAX_KW            = 150.0    # 15 nodes × 10 kW peak  →  generous ceiling
MAX_ENERGY_RES    = 10_000.0
MAX_STABLE_RES    = 1_000.0
MAX_PRICE         = 2.0      # USDC / kWh

# ── AMM initial reserves ──────────────────────────────────────────────────────
ENERGY_INIT  = 5_000.0
STABLE_INIT  = 421.0

# ── Action bounds → swap fee ──────────────────────────────────────────────────
FEE_MIN = 0.001   # 0.1%
FEE_MAX = 0.05    # 5.0%

# ── Episode length ────────────────────────────────────────────────────────────
MAX_STEPS = 48    # 48 × 30min = 24h per episode


class AegisEnv(gym.Env):
    """
    Custom Gymnasium environment for the AegisGrid microgrid protocol.
    Compatible with Stable-Baselines3 / any DDPG implementation.
    """

    metadata = {"render_modes": []}

    # ── Spaces ────────────────────────────────────────────────────────────────
    observation_space = spaces.Box(
        low  = np.array([ 0.0, 0.0, -1.0, 0.0, 0.0, 0.0, 0.0], dtype=np.float32),
        high = np.array([ 1.0, 1.0,  1.0, 1.0, 1.0, 1.0, 1.0], dtype=np.float32),
    )
    action_space = spaces.Box(
        low  = np.float32(FEE_MIN),
        high = np.float32(FEE_MAX),
        shape=(1,),
        dtype=np.float32,
    )

    def __init__(self):
        super().__init__()
        self.physics        = AegisGridPhysics(num_nodes=15)
        self._amm_x         = ENERGY_INIT
        self._amm_y         = STABLE_INIT
        self._step_count    = 0
        self._prev_price    = STABLE_INIT / ENERGY_INIT  # for volatility term
        self._current_state = np.zeros(7, dtype=np.float32)

        # Chaos state flags (set by chaos methods, consumed in step)
        self._chaos_queue: list[str] = []

    # ═══════════════════════════════════════════════════════════════════════════
    # CHAOS INJECTION METHODS  (spec §3.1.5)
    # ═══════════════════════════════════════════════════════════════════════════

    def simulate_cloud_cover(self):
        """Reduce solar generation by 40% — persists until reset_chaos()."""
        self.physics.inject_chaos("cloud_cover")

    def simulate_peak_demand(self):
        """Spike grid load by 60% — persists until reset_chaos()."""
        self.physics.inject_chaos("peak_demand")

    def inject_malicious_actor(self):
        """Flag a random node as a malicious low-reporter."""
        self.physics.inject_chaos("malicious_actor")

    def simulate_delivery_failure(self):
        """Force a slashing event on a random node next step."""
        self.physics.inject_chaos("delivery_fail")

    def reset_chaos(self):
        """Clear all active chaos modifiers."""
        self.physics.reset_chaos()

    # ═══════════════════════════════════════════════════════════════════════════
    # GYMNASIUM API
    # ═══════════════════════════════════════════════════════════════════════════

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        self.physics        = AegisGridPhysics(num_nodes=15)
        self._amm_x         = ENERGY_INIT
        self._amm_y         = STABLE_INIT
        self._step_count    = 0
        self._prev_price    = STABLE_INIT / ENERGY_INIT
        obs = self._make_obs_from_dict(self.physics.step(
            swap_fee=0.01, energy_reserve=self._amm_x, stable_reserve=self._amm_y
        ))
        self._current_state = obs
        return obs, {}

    def step(self, action):
        # Clamp action to valid fee range
        swap_fee = float(np.clip(action, FEE_MIN, FEE_MAX))

        # Advance physics
        raw = self.physics.step(
            swap_fee=swap_fee,
            energy_reserve=self._amm_x,
            stable_reserve=self._amm_y,
        )

        # Persist updated reserves
        self._amm_x = raw["energyReserve"]
        self._amm_y = raw["stableReserve"]

        obs    = self._make_obs_from_dict(raw)
        reward = self._compute_reward(raw, swap_fee)

        self._step_count += 1
        terminated = self._step_count >= MAX_STEPS
        truncated  = False

        info = {
            "gridLoad":      raw["gridLoad"],
            "generation":    raw["generation"],
            "gridImbalance": raw["gridImbalance"],
            "energyReserve": raw["energyReserve"],
            "stableReserve": raw["stableReserve"],
            "price":         raw["price"],
            "swapFee":       swap_fee,
            "reward":        reward,
            "slashEvents":   raw.get("slashEvents", []),
        }

        self._current_state = obs
        self._prev_price    = raw["price"]
        return obs, reward, terminated, truncated, info

    # ═══════════════════════════════════════════════════════════════════════════
    # REWARD FUNCTION   R_t = (w1·GridBalance) − (w2·EnergyWaste) − (w3·PriceVol)
    # ═══════════════════════════════════════════════════════════════════════════

    def _compute_reward(self, raw: dict, swap_fee: float) -> float:
        """
        Implements the reward function from the SDD §3.1.4:
          R_t = (w1·grid_balance) − (w2·energy_waste) − (w3·price_volatility)

        All components are normalised to [0, 1] so the weights have equal footing.
        """
        imbalance   = raw["gridImbalance"]
        generation  = max(raw["generation"], 1.0)
        total_load  = max(raw["gridLoad"],   1.0)
        price       = raw["price"]

        # grid_balance — penalises deviation from zero imbalance; peaks at 1.0 when balanced
        grid_balance = max(0.0, 1.0 - abs(imbalance) / MAX_KW)

        # energy_waste — excess solar generation that goes unabsorbed (surplus only)
        energy_waste = max(0.0, imbalance) / generation

        # price_volatility — relative swing in spot price vs previous tick
        price_volatility = abs(price - self._prev_price) / max(self._prev_price, 1e-6)
        price_volatility = min(price_volatility, 1.0)   # cap at 100% swing

        reward = (W1 * grid_balance) - (W2 * energy_waste) - (W3 * price_volatility)
        return round(float(reward), 4)

    # ═══════════════════════════════════════════════════════════════════════════
    # OBSERVATION BUILDER
    # ═══════════════════════════════════════════════════════════════════════════

    def _make_obs_from_dict(self, raw: dict) -> np.ndarray:
        """
        Normalise raw physics output into the 7-dim state vector.
        All values clamped to observation_space bounds.
        """
        total_load    = raw["gridLoad"]
        generation    = raw["generation"]
        imbalance     = raw["gridImbalance"]
        energy_res    = raw["energyReserve"]
        stable_res    = raw["stableReserve"]
        price         = raw["price"]

        # Aggregate SoC across all 15 nodes
        nodes = raw.get("nodes", [])
        agg_soc = (sum(n.get("battery_soc", 50.0) for n in nodes) / len(nodes)
                   if nodes else 50.0)

        obs = np.array([
            float(np.clip(total_load  / MAX_KW,         0.0, 1.0)),             # [0]
            float(np.clip(generation  / MAX_KW,         0.0, 1.0)),             # [1]
            float(np.clip(imbalance   / MAX_KW,        -1.0, 1.0)),             # [2]
            float(np.clip(energy_res  / MAX_ENERGY_RES, 0.0, 1.0)),             # [3]
            float(np.clip(stable_res  / MAX_STABLE_RES, 0.0, 1.0)),             # [4]
            float(np.clip(price       / MAX_PRICE,       0.0, 1.0)),             # [5]
            float(np.clip(agg_soc     / 100.0,           0.0, 1.0)),             # [6]
        ], dtype=np.float32)
        return obs

    # ═══════════════════════════════════════════════════════════════════════════
    # UTILITY
    # ═══════════════════════════════════════════════════════════════════════════

    def get_state_dict(self) -> dict:
        """Return the current observation as a labelled dict for the API."""
        s = self._current_state
        return {
            "grid_load_norm":      float(s[0]),
            "generation_norm":     float(s[1]),
            "imbalance_norm":      float(s[2]),
            "energy_reserve_norm": float(s[3]),
            "stable_reserve_norm": float(s[4]),
            "price_norm":          float(s[5]),
            "battery_soc_norm":    float(s[6]),
        }

    def render(self):  # not required for API use
        pass


# ── Standalone smoke-test ─────────────────────────────────────────────────────
if __name__ == "__main__":
    import gymnasium as gym
    print("=== AegisEnv Smoke Test ===")
    env = AegisEnv()
    obs, info = env.reset()
    print(f"Initial obs (7-dim): {obs}")

    env.simulate_cloud_cover()
    print("→ Cloud cover injected")

    for i in range(5):
        action = env.action_space.sample()
        obs, reward, terminated, truncated, info = env.step(action)
        print(f"  step {i+1} | fee={action[0]*100:.2f}% | imbalance={info['gridImbalance']:.2f}kW | reward={reward}")

    env.reset_chaos()
    env.simulate_peak_demand()
    print("→ Peak demand injected")
    obs, reward, terminated, truncated, info = env.step(np.array([0.03]))
    print(f"  Peak step | fee=3.00% | load={info['gridLoad']:.1f}kW | reward={reward}")
    print("=== PASS ===")
