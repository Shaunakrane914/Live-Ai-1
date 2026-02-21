"""
ddpg_agent.py — Deep Deterministic Policy Gradient (7-dim State)
=================================================================
Upgraded to match the AegisEnv 7-dimensional state space.

  State  s ∈ ℝ⁷  →  [load_norm, gen_norm, imbalance_norm,
                      energy_res_norm, stable_res_norm, price_norm, soc_norm]
  Action a ∈ [0,1] →  maps to swap fee [0.1%, 5.0%]

  Actor  : LayerNorm(7→256→256→1, Sigmoid)
  Critic : state→256 + action injected → 256→1
  Target networks updated via soft copy  τ = 0.005
  Exploration: Ornstein-Uhlenbeck noise  σ = 0.2, θ = 0.15
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from collections import deque
import random

# ── Device ────────────────────────────────────────────────────────────────────
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ── Hyperparameters ───────────────────────────────────────────────────────────
STATE_DIM    = 7             # full 7-dim vector
ACTION_DIM   = 1             # swap fee normalised to [0, 1]

ACTOR_LR     = 1e-4
CRITIC_LR    = 1e-3
GAMMA        = 0.99          # discount
TAU          = 0.005         # soft target update rate
BUFFER_SIZE  = 200_000
BATCH_SIZE   = 256
HIDDEN_DIM   = 256

# Swap fee rescaling helpers
FEE_MIN = 0.001              # 0.1%
FEE_MAX = 0.05               # 5.0%


def _action_to_fee(action_01: float) -> float:
    """Map normalised [0,1] action → fee in [FEE_MIN, FEE_MAX]."""
    return FEE_MIN + float(action_01) * (FEE_MAX - FEE_MIN)


# ══════════════════════════════════════════════════════════════════════════════
# REPLAY BUFFER
# ══════════════════════════════════════════════════════════════════════════════
class ReplayBuffer:
    """Circular experience buffer with fast numpy batching."""

    def __init__(self, capacity: int = BUFFER_SIZE):
        self.buffer = deque(maxlen=capacity)

    def push(self, state, action, reward, next_state, done):
        self.buffer.append((
            np.asarray(state,      dtype=np.float32),
            np.asarray(action,     dtype=np.float32).reshape(1),
            np.float32(reward),
            np.asarray(next_state, dtype=np.float32),
            np.float32(done),
        ))

    def sample(self, batch_size: int = BATCH_SIZE):
        batch = random.sample(self.buffer, batch_size)
        s, a, r, ns, d = map(np.stack, zip(*batch))
        to = lambda x: torch.from_numpy(x).to(DEVICE)
        return to(s), to(a), to(r).unsqueeze(1), to(ns), to(d).unsqueeze(1)

    def __len__(self):
        return len(self.buffer)


# ══════════════════════════════════════════════════════════════════════════════
# ORNSTEIN-UHLENBECK NOISE
# ══════════════════════════════════════════════════════════════════════════════
class OUNoise:
    """Temporally correlated exploration noise."""

    def __init__(self, size=ACTION_DIM, mu=0.0, theta=0.15, sigma=0.2):
        self.size  = size
        self.mu    = mu * np.ones(size)
        self.theta = theta
        self.sigma = sigma
        self.reset()

    def reset(self):
        self.state = np.copy(self.mu)

    def sample(self):
        dx = self.theta * (self.mu - self.state) + self.sigma * np.random.randn(self.size)
        self.state += dx
        return self.state


# ══════════════════════════════════════════════════════════════════════════════
# ACTOR NETWORK  (state → swap fee)
# ══════════════════════════════════════════════════════════════════════════════
class Actor(nn.Module):
    """
    Maps 7-dim grid state → normalised swap fee ∈ (0, 1).
    LayerNorm prevents gradient explosion with non-stationary inputs.
    """

    def __init__(self, state_dim=STATE_DIM, action_dim=ACTION_DIM, hidden=HIDDEN_DIM):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(state_dim, hidden),
            nn.LayerNorm(hidden),
            nn.ReLU(),
            nn.Linear(hidden, hidden),
            nn.LayerNorm(hidden),
            nn.ReLU(),
            nn.Linear(hidden, action_dim),
            nn.Sigmoid(),         # bounds output to (0, 1)
        )
        self._init_weights()

    def _init_weights(self):
        for layer in self.net:
            if isinstance(layer, nn.Linear):
                nn.init.xavier_uniform_(layer.weight)
                nn.init.zeros_(layer.bias)
        # Conservative final-layer init → starts near mid-fee
        nn.init.uniform_(self.net[-2].weight, -3e-3, 3e-3)
        nn.init.zeros_(self.net[-2].bias)

    def forward(self, state):
        return self.net(state)

    def get_fee_pct(self, state_np: np.ndarray) -> float:
        """Convenience: full-precision fee in % from a numpy state vector."""
        t = torch.tensor(state_np, dtype=torch.float32).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            a = self.forward(t).item()
        return round(_action_to_fee(a) * 100, 3)   # in percent


# ══════════════════════════════════════════════════════════════════════════════
# CRITIC NETWORK  ((state, action) → Q-value)
# ══════════════════════════════════════════════════════════════════════════════
class Critic(nn.Module):
    """
    Action injected at the second hidden layer — standard DDPG pattern.
    Allows state features to develop before merging with action.
    """

    def __init__(self, state_dim=STATE_DIM, action_dim=ACTION_DIM, hidden=HIDDEN_DIM):
        super().__init__()
        self.state_branch = nn.Sequential(
            nn.Linear(state_dim, hidden),
            nn.LayerNorm(hidden),
            nn.ReLU(),
        )
        self.combined = nn.Sequential(
            nn.Linear(hidden + action_dim, hidden),
            nn.ReLU(),
            nn.Linear(hidden, 1),
        )
        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                nn.init.zeros_(m.bias)

    def forward(self, state, action):
        s = self.state_branch(state)
        return self.combined(torch.cat([s, action], dim=-1))


# ══════════════════════════════════════════════════════════════════════════════
# DDPG AGENT
# ══════════════════════════════════════════════════════════════════════════════
class DDPGAgent:
    """
    Orchestrates Actor, Critic, target networks, experience replay,
    and soft target updates for AegisGrid fee optimisation.
    """

    def __init__(self):
        # Online + target networks
        self.actor          = Actor().to(DEVICE)
        self.critic         = Critic().to(DEVICE)
        self.actor_target   = Actor().to(DEVICE)
        self.critic_target  = Critic().to(DEVICE)
        self.actor_target.load_state_dict(self.actor.state_dict())
        self.critic_target.load_state_dict(self.critic.state_dict())

        # Optimizers
        self.actor_opt  = torch.optim.Adam(self.actor.parameters(),  lr=ACTOR_LR)
        self.critic_opt = torch.optim.Adam(self.critic.parameters(), lr=CRITIC_LR)

        self.buffer  = ReplayBuffer()
        self.noise   = OUNoise()
        self.updates = 0

    # ── Action selection ──────────────────────────────────────────────────────
    def select_action(self, state: np.ndarray, explore: bool = True) -> float:
        """
        Returns swap fee in [FEE_MIN, FEE_MAX] with optional OU exploration.
        """
        t = torch.tensor(state, dtype=torch.float32).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            action_norm = self.actor(t).cpu().numpy().flatten()
        if explore:
            action_norm = action_norm + self.noise.sample()
        action_norm = np.clip(action_norm, 0.0, 1.0)
        return float(_action_to_fee(action_norm[0]))

    # ── Store experience ──────────────────────────────────────────────────────
    def store(self, state, action_fee, reward, next_state, done):
        """Normalise fee back to [0,1] before storing."""
        action_norm = (action_fee - FEE_MIN) / (FEE_MAX - FEE_MIN)
        self.buffer.push(state, [action_norm], reward, next_state, done)

    # ── Learning step ─────────────────────────────────────────────────────────
    def update(self):
        """One DDPG gradient step. Skips if buffer not warm."""
        if len(self.buffer) < BATCH_SIZE:
            return None, None

        states, actions, rewards, next_states, dones = self.buffer.sample()

        # Critic update
        with torch.no_grad():
            next_actions = self.actor_target(next_states)
            target_q     = rewards + GAMMA * (1 - dones) * \
                           self.critic_target(next_states, next_actions)
        current_q   = self.critic(states, actions)
        critic_loss = F.mse_loss(current_q, target_q)

        self.critic_opt.zero_grad()
        critic_loss.backward()
        nn.utils.clip_grad_norm_(self.critic.parameters(), 1.0)
        self.critic_opt.step()

        # Actor update
        actor_loss = -self.critic(states, self.actor(states)).mean()
        self.actor_opt.zero_grad()
        actor_loss.backward()
        nn.utils.clip_grad_norm_(self.actor.parameters(), 1.0)
        self.actor_opt.step()

        # Soft target update
        self._soft_update(self.actor,  self.actor_target)
        self._soft_update(self.critic, self.critic_target)

        self.updates += 1
        return critic_loss.item(), actor_loss.item()

    def _soft_update(self, online: nn.Module, target: nn.Module):
        for p_o, p_t in zip(online.parameters(), target.parameters()):
            p_t.data.copy_(TAU * p_o.data + (1 - TAU) * p_t.data)

    # ── Persistence ───────────────────────────────────────────────────────────
    def save(self, path: str = "actor_weights.pth"):
        torch.save(self.actor.state_dict(), path)
        print(f"[DDPG] Weights saved → {path}")

    def load(self, path: str = "actor_weights.pth"):
        self.actor.load_state_dict(torch.load(path, map_location=DEVICE))
        self.actor_target.load_state_dict(self.actor.state_dict())
        print(f"[DDPG] Weights loaded ← {path}")


# ── Standalone test ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    print(f"=== DDPG 7-dim Smoke Test  |  device={DEVICE} ===")
    agent = DDPGAgent()
    dummy = np.random.rand(7).astype(np.float32)
    fee   = agent.select_action(dummy, explore=False)
    pct   = agent.actor.get_fee_pct(dummy)
    print(f"  State(7): {dummy.round(3)}")
    print(f"  Action → fee = {fee*100:.3f}%  (actor: {pct}%)")
    print("=== PASS ===")
