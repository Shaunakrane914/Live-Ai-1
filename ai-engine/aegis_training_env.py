import os
import numpy as np
import pandas as pd

class AegisGridEnv:
    """
    Gymnasium-style RL environment for the AegisGrid DDPG agent (Phase 3 training).

    This environment wraps the preprocessed CSV data (aegis_training_data.csv) 
    to provide a standardized interface for reinforcement learning. It handles 
    observation normalization, action mapping, and reward shaping for offline 
    training.

    Architectural Pattern:
        - Vectorized node processing for high throughput during training cycles.
        - Direct NumPy buffer operations to eliminate dictionary/loop overhead.
    """

    # ── Microgrid constants ──────────────────────────────────────────
    NUM_NODES         = 15
    SOLAR_PEAK_KW     = 8.0          # max solar per house
    LOAD_PEAK_KW      = 5.0          # max load per house
    BATTERY_CAP_KWH   = 13.5         # per-node Tesla Powerwall equivalent
    NOISE_STD         = 0.05         # Gaussian spread across nodes (5%)

    # AMM reserve parameters
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
        
        # Load CSV into NumPy memory for performance
        df = pd.read_csv(data_path, index_col="timestamp", parse_dates=True)
        self._solar_norms = df['solar_norm'].to_numpy(dtype=np.float32)
        self._load_norms  = df['load_norm'].to_numpy(dtype=np.float32)
        self.n_rows       = len(self._solar_norms)
        self._row_idx     = 0

        # Vectorized node state
        self._soc     = np.empty(self.NUM_NODES, dtype=np.float64)
        self._bat_cap = np.empty(self.NUM_NODES, dtype=np.float64)
        self._amm_x   = self.AMM_ENERGY_INIT
        self._amm_y   = self.AMM_STABLE_INIT
        self._reset_nodes()

        print(f"✅ AegisGrid Training Env loaded: {self.n_rows} timesteps")

    def _reset_nodes(self):
        """Randomise SoC and battery capacity for all nodes."""
        self._soc[:]     = 50.0 + np.random.uniform(-10, 10, self.NUM_NODES)
        self._bat_cap[:] = self.BATTERY_CAP_KWH + np.random.uniform(-1.0, 1.0, self.NUM_NODES)

    def reset(self) -> np.ndarray:
        """Reset to beginning of dataset."""
        self._row_idx = 0
        self._amm_x   = self.AMM_ENERGY_INIT
        self._amm_y   = self.AMM_STABLE_INIT
        self._reset_nodes()
        return self._get_state()

    def step(self, action: float):
        """Advance one 30-minute timestep."""
        if self._row_idx >= self.n_rows:
            return self._get_state(), True, {}

        solar_norm = float(self._solar_norms[self._row_idx])
        load_norm  = float(self._load_norms[self._row_idx])

        # Proportional Microgrid Scaling
        noise_solar = np.random.normal(0.0, self.NOISE_STD * self.SOLAR_PEAK_KW, self.NUM_NODES)
        noise_load  = np.random.normal(0.0, self.NOISE_STD * self.LOAD_PEAK_KW,  self.NUM_NODES)
        gen  = np.maximum(0.0, solar_norm * self.SOLAR_PEAK_KW + noise_solar)
        load = np.maximum(0.2, load_norm  * self.LOAD_PEAK_KW  + noise_load)

        # Battery state machine
        net_kwh    = (gen - load) * 0.5
        charge_pct = net_kwh * (100.0 / self._bat_cap)
        np.clip(self._soc + charge_pct, 0.0, 100.0, out=self._soc)

        total_gen     = gen.sum()
        total_load    = load.sum()
        net_imbalance = total_gen - total_load
        aggregate_soc = self._soc.mean()

        # AMM drift
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

    def _get_state(self) -> np.ndarray:
        idx = min(self._row_idx, self.n_rows - 1)
        imbalance = (float(self._solar_norms[idx]) - float(self._load_norms[idx])) * self.NUM_NODES * self.SOLAR_PEAK_KW
        soc       = float(self._soc.mean())
        price     = self._amm_y / self._amm_x
        return self._build_state(imbalance, soc, price)

    def _build_state(self, net_imbalance: float, aggregate_soc: float,
                     spot_price: float) -> np.ndarray:
        """Normalise state components for Actor input."""
        s_imbalance = np.clip(net_imbalance / self.IMBALANCE_SCALE, -1.0, 1.0)
        s_soc       = aggregate_soc / self.SOC_MAX
        s_price     = np.clip(spot_price    / self.PRICE_MAX, 0.0, 1.0)
        return np.array([s_imbalance, s_soc, s_price], dtype=np.float32)
