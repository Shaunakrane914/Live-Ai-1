"""
train_agent.py — DDPG Offline Reinforcement Learning Training Loop
==================================================================
Trains the DDPG agent for 500 episodes using the AegisGridEnv 
environment loaded from aegis_training_data.csv.

Reward function (mathematically defined):
  r = -α·|net_imbalance|
      - β·max(0, SOC_threshold - aggregate_soc)    ← low-battery penalty
      - BLACKOUT_PENALTY  if deficit AND soc < 20   ← severe event
      + SURPLUS_BONUS     if small surplus AND soc > 70 ← efficiency reward

Outputs:
  aegis_actor_weights.pth  ← trained actor for Phase 4 on-chain integration
  training_log.csv         ← episode rewards for visualization
"""

import os
import json
import numpy as np
import pandas as pd
import torch
import csv
import time

# Local imports
from ddpg_agent import DDPGAgent, DEVICE, BATCH_SIZE
from physics_oracle import AegisGridEnv

# ── Config ────────────────────────────────────────────────────────────────────
EPISODES          = 500
WARMUP_STEPS      = 2048       # well-populate buffer before sparse updates
EVAL_INTERVAL     = 50         # print progress every N episodes
UPDATE_EVERY      = 16         # gradient update every N env steps (not every step)
                               # cuts GPU calls: 1,632 → ~102 per episode
SAVE_PATH         = os.path.join(os.path.dirname(__file__), "aegis_actor_weights.pth")
LOG_PATH          = os.path.join(os.path.dirname(__file__), "training_log.csv")

# ── Reward hyperparameters ────────────────────────────────────────────────────
ALPHA             = 2.0        # imbalance penalty weight
BETA              = 0.5        # low-SOC penalty weight
SOC_THRESHOLD     = 20.0       # % below which battery is "critically low"
BLACKOUT_PENALTY  = -50.0      # fired when deficit AND soc < 20%
SURPLUS_BONUS     = +2.0       # small reward for efficient surplus state


def compute_reward(net_imbalance: float, aggregate_soc: float) -> float:
    """
    Mathematically defined reward function.
    
    Args:
        net_imbalance  : grid_gen - grid_load (positive = surplus, negative = deficit)
        aggregate_soc  : mean battery SoC across all nodes [0, 100]
    
    Returns:
        Scalar reward signal.
    """
    # Primary penalty: discourage any imbalance in either direction
    r = -ALPHA * abs(net_imbalance)

    # Secondary penalty: encourage keeping batteries charged
    if aggregate_soc < SOC_THRESHOLD:
        r -= BETA * (SOC_THRESHOLD - aggregate_soc)

    # Blackout event: deficit AND critically low battery → severe penalty
    if net_imbalance < -0.5 and aggregate_soc < SOC_THRESHOLD:
        r += BLACKOUT_PENALTY

    # Efficiency bonus: small surplus with healthy battery = ideal
    if 0.0 <= net_imbalance <= 2.0 and aggregate_soc > 70.0:
        r += SURPLUS_BONUS

    return float(r)


def train():
    print("=" * 60)
    print("  AegisGrid DDPG Training — Phase 3")
    print(f"  Device : {DEVICE}")
    print(f"  Episodes: {EPISODES}")
    print(f"  Warmup  : {WARMUP_STEPS} random steps")
    print("=" * 60)

    # ── Init environment and agent ────────────────────────────────
    env     = AegisGridEnv()
    agent   = DDPGAgent()
    
    episode_rewards = []
    best_avg_reward = -float('inf')

    # Prepare CSV log file
    with open(LOG_PATH, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['episode', 'total_reward', 'avg_reward_50', 
                         'critic_loss', 'actor_loss', 'mean_fee_bps'])

    # ── Warmup: fill replay buffer with random actions ────────────
    print(f"\n[Warmup] Filling replay buffer with {WARMUP_STEPS} random transitions...")
    state = env.reset()
    for step in range(WARMUP_STEPS):
        action = np.random.uniform(0.0, 1.0, size=(1,))
        next_state, done, info = env.step(action[0])
        reward = compute_reward(info['net_imbalance'], info['aggregate_soc'])
        agent.buffer.push(state, action, reward, next_state, done)
        state = env.reset() if done else next_state
    print(f"[Warmup] Buffer size: {len(agent.buffer):,}  ✅\n")

    # ── Training loop ─────────────────────────────────────────────
    t_start = time.time()

    for episode in range(1, EPISODES + 1):
        state = env.reset()
        agent.noise.reset()

        ep_reward    = 0.0
        ep_steps     = 0
        ep_critic_l  = 0.0
        ep_actor_l   = 0.0
        ep_fee_sum   = 0.0

        while True:
            # Agent selects action with OU exploration noise
            action = agent.select_action(state, explore=True)
            next_state, done, info = env.step(action[0])

            reward = compute_reward(info['net_imbalance'], info['aggregate_soc'])
            agent.buffer.push(state, action, reward, next_state, float(done))

            # DDPG gradient update every UPDATE_EVERY steps
            # (GPU latency dominates when called every single step)
            if ep_steps % UPDATE_EVERY == 0:
                c_loss, a_loss = agent.update()
                if c_loss is not None:
                    ep_critic_l += c_loss
                    ep_actor_l  += a_loss

            ep_reward  += reward
            ep_fee_sum += action[0] * 1000
            ep_steps   += 1
            state       = next_state

            if done:
                break

        # ── Episode bookkeeping ───────────────────────────────────
        episode_rewards.append(ep_reward)
        avg_50 = np.mean(episode_rewards[-50:])
        mean_fee = ep_fee_sum / max(ep_steps, 1)
        n_upd    = max(ep_steps, 1)

        # Save best model
        if avg_50 > best_avg_reward and episode >= 50:
            best_avg_reward = avg_50
            agent.save(SAVE_PATH)

        # Log to CSV
        with open(LOG_PATH, 'a', newline='') as f:
            csv.writer(f).writerow([
                episode, round(ep_reward, 4), round(avg_50, 4),
                round(ep_critic_l / n_upd, 6),
                round(ep_actor_l  / n_upd, 6),
                round(mean_fee, 1)
            ])

        # ── Progress print ────────────────────────────────────────
        if episode % EVAL_INTERVAL == 0 or episode == 1:
            elapsed = time.time() - t_start
            print(
                f"  Ep {episode:>4}/{EPISODES} │ "
                f"Reward: {ep_reward:>8.2f} │ "
                f"Avg50: {avg_50:>8.2f} │ "
                f"Fee: {mean_fee:>6.1f} bps │ "
                f"Steps: {ep_steps:>4} │ "
                f"{elapsed:.0f}s"
            )

    # Final save (most recent weights, regardless of best)
    final_path = SAVE_PATH.replace('.pth', '_final.pth')
    agent.save(final_path)

    # ── Summary ───────────────────────────────────────────────────
    elapsed_total = time.time() - t_start
    print("\n" + "=" * 60)
    print("  TRAINING COMPLETE")
    print("=" * 60)
    print(f"  Total episodes : {EPISODES}")
    print(f"  Total time     : {elapsed_total:.1f}s")
    print(f"  Best avg reward: {best_avg_reward:.4f}  (window=50)")
    print(f"  Best weights   → {SAVE_PATH}")
    print(f"  Final weights  → {final_path}")
    print(f"  Training log   → {LOG_PATH}")

    # Convergence check
    if len(episode_rewards) >= 100:
        first_100  = np.mean(episode_rewards[:100])
        last_100   = np.mean(episode_rewards[-100:])
        improvement = last_100 - first_100
        trend = "📈 IMPROVING" if improvement > 0 else "📉 DEGRADING"
        print(f"\n  Reward trend: {trend}")
        print(f"  First-100 avg: {first_100:.4f}")
        print(f"  Last-100  avg: {last_100:.4f}")
        print(f"  Δ improvement: {improvement:.4f}")


if __name__ == "__main__":
    train()
