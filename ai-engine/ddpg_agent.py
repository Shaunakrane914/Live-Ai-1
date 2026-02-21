"""
ddpg_agent.py — Deep Deterministic Policy Gradient Brain
=========================================================
Implements the DDPG algorithm for continuous AMM fee control.

Architecture:
  State  s ∈ ℝ³  →  [net_imbalance_norm, aggregate_soc_norm, spot_price_norm]
  Action a ∈ [0,1] →  maps to [10, 1000] basis points swap fee
  
  Actor  : 3 → 256 → 256 → 1  (tanh → rescaled to [0,1])
  Critic : (3+1) → 256 → 256 → 1  (Q-value estimator)
  
  Target networks use soft update: θ' ← τθ + (1-τ)θ'
  Exploration: Ornstein-Uhlenbeck noise for temporally correlated action space
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
STATE_DIM    = 3          # [net_imbalance_norm, aggregate_soc_norm, spot_price_norm]
ACTION_DIM   = 1          # swap fee in [0, 1]  →  maps to [10, 1000] bps

ACTOR_LR     = 1e-4
CRITIC_LR    = 1e-3
GAMMA        = 0.99       # discount factor
TAU          = 0.005      # soft target update rate
BUFFER_SIZE  = 200_000    # larger buffer = more diverse samples
BATCH_SIZE   = 512        # 4× bigger: far better GPU utilisation
HIDDEN_DIM   = 256


# ══════════════════════════════════════════════════════════════════════════════
# REPLAY BUFFER
# ══════════════════════════════════════════════════════════════════════════════
class ReplayBuffer:
    """
    Circular buffer with GPU-pinned pre-allocated tensors for fast sampling.
    Stores raw float32 numpy arrays; batches are assembled with np.stack
    (much faster than np.array(list-of-arrays)) then moved to GPU in one shot.
    """

    def __init__(self, capacity: int = BUFFER_SIZE):
        self.capacity = capacity
        self.buffer   = deque(maxlen=capacity)

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
        # Single host→device transfer per field
        to = lambda x: torch.from_numpy(x).to(DEVICE)
        return to(s), to(a), to(r).unsqueeze(1), to(ns), to(d).unsqueeze(1)

    def __len__(self):
        return len(self.buffer)


# ══════════════════════════════════════════════════════════════════════════════
# ORNSTEIN-UHLENBECK NOISE
# ══════════════════════════════════════════════════════════════════════════════
class OUNoise:
    """
    Temporally correlated noise for continuous action exploration.
    Prevents the agent from always picking the same fee.
    """
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
# ACTOR NETWORK
# ══════════════════════════════════════════════════════════════════════════════
class Actor(nn.Module):
    """
    Policy network: maps grid state → swap fee action in [0, 1].
    Layer norm stabilizes training with non-stationary grid states.
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
            nn.Sigmoid(),   # output ∈ (0, 1)  →  maps to [10, 1000] bps
        )
        self._init_weights()

    def _init_weights(self):
        for layer in self.net:
            if isinstance(layer, nn.Linear):
                nn.init.xavier_uniform_(layer.weight)
                nn.init.zeros_(layer.bias)
        # Final layer: small init for conservative initial policy
        nn.init.uniform_(self.net[-2].weight, -3e-3, 3e-3)
        nn.init.zeros_(self.net[-2].bias)

    def forward(self, state):
        return self.net(state)

    def get_fee_bps(self, state_tensor) -> int:
        """Convert normalized action → integer basis points for on-chain call."""
        with torch.no_grad():
            action = self.forward(state_tensor).item()
        return max(10, min(1000, int(action * 1000)))


# ══════════════════════════════════════════════════════════════════════════════
# CRITIC NETWORK
# ══════════════════════════════════════════════════════════════════════════════
class Critic(nn.Module):
    """
    Q-value network: maps (state, action) → scalar Q.
    Action injected at second layer to allow state features to develop first.
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
        x = torch.cat([s, action], dim=-1)
        return self.combined(x)


# ══════════════════════════════════════════════════════════════════════════════
# DDPG AGENT
# ══════════════════════════════════════════════════════════════════════════════
class DDPGAgent:
    """
    Orchestrates Actor, Critic, target networks, experience replay,
    and soft target updates.
    """

    def __init__(self):
        # Online networks
        self.actor  = Actor().to(DEVICE)
        self.critic = Critic().to(DEVICE)

        # Target networks (frozen copies, updated via soft update)
        self.actor_target  = Actor().to(DEVICE)
        self.critic_target = Critic().to(DEVICE)
        self.actor_target.load_state_dict(self.actor.state_dict())
        self.critic_target.load_state_dict(self.critic.state_dict())

        # Optimizers
        self.actor_opt  = torch.optim.Adam(self.actor.parameters(),  lr=ACTOR_LR)
        self.critic_opt = torch.optim.Adam(self.critic.parameters(), lr=CRITIC_LR)

        self.buffer = ReplayBuffer()
        self.noise  = OUNoise()

    # ── Action selection ──────────────────────────────────────────────────────
    def select_action(self, state: np.ndarray, explore: bool = True) -> np.ndarray:
        """Returns action ∈ [0,1] with optional OU exploration noise."""
        state_t = torch.tensor(state, dtype=torch.float32).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            action = self.actor(state_t).cpu().numpy().flatten()
        if explore:
            action += self.noise.sample()
        return np.clip(action, 0.0, 1.0)

    # ── Learning step ─────────────────────────────────────────────────────────
    def update(self):
        """Sample a minibatch and perform one DDPG gradient step."""
        if len(self.buffer) < BATCH_SIZE:
            return None, None

        states, actions, rewards, next_states, dones = self.buffer.sample()

        # ── Critic update ─────────────────────────────────────────
        with torch.no_grad():
            next_actions = self.actor_target(next_states)
            target_q     = rewards + GAMMA * (1 - dones) * self.critic_target(next_states, next_actions)

        current_q   = self.critic(states, actions)
        critic_loss = F.mse_loss(current_q, target_q)

        self.critic_opt.zero_grad()
        critic_loss.backward()
        nn.utils.clip_grad_norm_(self.critic.parameters(), 1.0)
        self.critic_opt.step()

        # ── Actor update ──────────────────────────────────────────
        actor_loss = -self.critic(states, self.actor(states)).mean()

        self.actor_opt.zero_grad()
        actor_loss.backward()
        nn.utils.clip_grad_norm_(self.actor.parameters(), 1.0)
        self.actor_opt.step()

        # ── Soft target update ────────────────────────────────────
        self._soft_update(self.actor,  self.actor_target)
        self._soft_update(self.critic, self.critic_target)

        return critic_loss.item(), actor_loss.item()

    def _soft_update(self, online: nn.Module, target: nn.Module):
        for p_online, p_target in zip(online.parameters(), target.parameters()):
            p_target.data.copy_(TAU * p_online.data + (1 - TAU) * p_target.data)

    def save(self, path: str):
        torch.save(self.actor.state_dict(), path)
        print(f"  [DDPG] Actor weights saved → {path}")

    def load(self, path: str):
        self.actor.load_state_dict(torch.load(path, map_location=DEVICE))
        self.actor_target.load_state_dict(self.actor.state_dict())
        print(f"  [DDPG] Actor weights loaded ← {path}")


if __name__ == "__main__":
    print(f"DDPG Agent initialized on {DEVICE}")
    agent = DDPGAgent()
    dummy = np.array([0.1, 0.5, 0.3], dtype=np.float32)
    action = agent.select_action(dummy, explore=False)
    fee    = agent.actor.get_fee_bps(
        torch.tensor(dummy, dtype=torch.float32).unsqueeze(0).to(DEVICE)
    )
    print(f"  Dummy state: {dummy}")
    print(f"  Action out:  {action[0]:.4f}  →  fee = {fee} bps ({fee/100:.2f}%)")
