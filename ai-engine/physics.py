import os
import numpy as np
import math

class AegisGridPhysics:
    """
    Deterministic simulation of a microgrid's daily energy cycle.

    This engine models the physical interaction between solar generation, household
    load, and Tesla Powerwall-equivalent batteries across 15 independent prosumer nodes.
    It simulates 'duck curve' demand patterns and sinusoidal solar yields with 
    stochastic noise for realism.
    """

    def __init__(self, num_nodes=15, battery_capacity_kwh=13.5):
        """
        Initializes the physics environment.

        Args:
            num_nodes (int): Number of houses in the simulated neighborhood.
            battery_capacity_kwh (float): Nominal kWh capacity of each node's battery.
        """
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
        self._solar_max_kw = 0.0         # cache for telemetry
        self._grid_load_kw = 0.0

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
            self._chaos_malicious = np.random.randint(0, self.num_nodes)
        elif chaos_type == "delivery_fail":
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
        """
        Advances the simulation by 30 minutes and returns full grid state.

        Args:
            swap_fee (float): Current AMM swap fee percentage.
            energy_reserve (float): Virtual energy inventory in the AMM pool.
            stable_reserve (float): Virtual USDC liquidity in the AMM pool.

        Returns:
            dict: Comprehensive snapshot of the grid, including per-node telemetry.
        """
        self.current_hour = (self.current_hour + 0.5) % 24

        total_gen = 0.0
        total_load = 0.0
        slash_events = []

        for i, node in enumerate(self.nodes):
            gen = max(0, self.get_solar_yield(self.current_hour, node["solar_capacity"])
                      + np.random.normal(0, 0.2))
            load = max(0, self.get_duck_curve_load(self.current_hour, node["base_load"])
                       + np.random.normal(0, 0.2))

            if i == self._chaos_malicious:
                gen *= 0.1

            net_energy = gen - load
            if net_energy > 0:
                charge_pct = net_energy * (100 / node["battery_capacity"])
                node["battery_soc"] = min(100.0, node["battery_soc"] + charge_pct)
            else:
                discharge_pct = abs(net_energy) * (100 / node["battery_capacity"])
                node["battery_soc"] = max(0.0, node["battery_soc"] - discharge_pct)

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
        price = round(stable_reserve / energy_reserve, 6)

        balance_norm = max(0.0, 1.0 - abs(grid_imbalance) / max(total_gen, 1))
        waste = max(0.0, grid_imbalance) / max(total_gen, 1)
        price_vol = abs(swap_fee - 1.34) / 4.9
        reward = round(0.6 * balance_norm - 0.2 * waste - 0.2 * price_vol, 4)

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
