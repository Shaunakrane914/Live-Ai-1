# Phase 5: Frontend Integration Reference

This document describes how the React app is wired so you can plug in Python WebSockets, Hardhat contracts, and zk-proofs with **exact, drop-in hooks**.

---

## 1. `src/` Directory Structure

```
src/
├── App.tsx                    # Router + WebSocketProvider + DashboardLayout
├── main.tsx
├── index.css
├── store/
│   └── useGridStore.ts        # Single source of truth (Zustand): grid state + events
├── providers/
│   └── WebSocketProvider.tsx  # Socket.io client; applies ticks + events to store; exposes emit()
├── pages/
│   ├── OverviewPage.tsx       # Macro grid: 3D canvas + AI telemetry + Chaos Engine
│   ├── AmmPage.tsx            # AMM Trading Floor (bonding curve, swap UI)
│   ├── NodePage.tsx           # Prosumer node detail (gauges, wallet, zk terminal)
│   └── ZkTerminalPage.tsx     # Zero-Knowledge Terminal (ledger, proofs)
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.tsx # Shell: sidebar + TopKPIBar + outlet
│   │   ├── Sidebar.tsx
│   │   └── TopKPIBar.tsx      # KPI pills: Grid Load, Generation, Price, Swap Fee, etc.
│   ├── three/
│   │   ├── MicrogridCanvas.tsx # 3D scene: nodes + AMM core + particle flows
│   │   ├── ProsumerNode.tsx   # Single node mesh + behavior color
│   │   ├── AMMCore.tsx        # Central AMM visual
│   │   └── ParticleFlow.tsx   # Swap/liquidity flow particles
│   └── ui/
│       ├── ChaosPanel.tsx     # Reusable chaos buttons (Cloud Cover, Peak Demand, etc.)
│       ├── GlassCard.tsx
│       ├── CircularGauge.tsx
│       └── AutoAegisToggle.tsx
```

---

## 2. Main Dashboard / State

### Where placeholder data lives

- **`store/useGridStore.ts`**  
  Initial state is **placeholder** (e.g. `gridLoad: 142.7`, `generation: 158.3`, `price: 0.0842`, `swapFee: 1.34`, …).  
  Live data overwrites this when the gateway sends `simulation_tick`.

- **`providers/WebSocketProvider.tsx`**  
  - Connects to `VITE_SOCKET_URL` (default `http://localhost:8000`).  
  - On **connect**: stops mock; listens for `simulation_tick` and `grid_event`.  
  - On **disconnect**: starts **mock** (interval 500 ms) so the UI still moves.  
  - **`applyTick(tick)`** and **`pushEvent(evt)`** are the only writers to grid state and events.

### Store shape (must match Python tick payload)

```ts
// useGridStore.ts
interface GridState {
  gridLoad: number      // kW
  generation: number    // kW
  price: number        // USDC per kWh
  swapFee: number      // % (DDPG-controlled)
  energyReserve: number
  stableReserve: number
  reward: number
  gridImbalance: number  // generation - gridLoad
  connected: boolean
  lastTickAt: number
  events: GridEvent[]
  applyTick: (tick) => void
  pushEvent: (event) => void
  setConnected: (v: boolean) => void
}
```

**Python `/tick`** returns camelCase: `gridLoad`, `generation`, `price`, `swapFee`, `energyReserve`, `stableReserve`, `reward`, `gridImbalance`. The Node gateway forwards this as-is; **no mapping needed** in the frontend.

---

## 3. The 3D Canvas (Microgrid nodes)

### Component

- **`components/three/MicrogridCanvas.tsx`**  
  - Wraps a **React Three Fiber** `<Canvas>`.  
  - Renders a **memoized `<Scene>`** that reads from `useGridStore`: `generation`, `gridLoad`, `swapFee`, `energyReserve`, `stableReserve`, `events`.

### How node data is built (currently)

- **No per-node API yet.**  
  Node list is **synthetic** inside `MicrogridCanvas`:
  - `NODE_COUNT = 12` (UI shows 12; physics uses 15).
  - For each of 12 positions, it does:
    - `perGen = generation / NODE_COUNT`, `perLoad = gridLoad / NODE_COUNT`
    - Adds sine/cosine variance for variety.
    - Behavior: `selling` / `buying` / `malicious` / `neutral` from `excess` and `swapFee`.
  - So the 3D view **already reacts to live ticks** (generation, gridLoad, swapFee, reserves) without any change.

### Optional Phase 5 enhancement: real per-node data

- Python **pops `nodes`** before returning tick (to keep payload small).  
- To drive 3D from **real** nodes:
  1. Either expose a separate **`/nodes`** (or include `nodes` in tick when a query param is set), and in the frontend call it on interval or on connect.
  2. Or add to the store something like `nodes: Array<{ id, generation, consumption, batterySoc, behavior? }>` and in `MicrogridCanvas` use `store.nodes` when present, otherwise keep current synthetic derivation.

---

## 4. The Chaos Panel (Cloud Cover / Peak Demand buttons)

### Two places that trigger chaos

1. **`components/ui/ChaosPanel.tsx`**  
   - Uses **`useSocketEmit()`** and calls `emit(btn.event)` for each button.  
   - Buttons: `chaos:cloud_cover`, `chaos:peak_demand`, `chaos:malicious_actor`, `chaos:delivery_fail`.

2. **`pages/OverviewPage.tsx`**  
   - “Chaos Engine” section: same four buttons, same `emit(btn.event)` via **`useSocketEmit()`**.

### Emit behavior

- **`WebSocketProvider.tsx`** exposes **`emit(event, data?)`**.  
  - If **socket connected**: `socket.emit(event, data)`.  
  - If **disconnected**: no server call; instead **pushEvent** with a mock CHAOS message so the ticker still shows something.

### Backend (Node gateway)

- **`backend/index.js`** listens for:
  - `chaos:cloud_cover` → `POST /chaos` with `{ type: 'cloud_cover' }`
  - `chaos:peak_demand` → `{ type: 'peak_demand' }`
  - `chaos:malicious_actor` → `{ type: 'malicious_actor' }`
  - `chaos:delivery_fail` → `{ type: 'delivery_fail' }`
- After calling Python, it emits **`grid_event`** with type `CHAOS` and a human-readable message so the frontend ticker updates.

**No frontend change needed** for chaos → Python; it’s already wired. Phase 5 only needs to ensure the gateway and Python are running and the frontend uses `VITE_SOCKET_URL` (or default 8000).

---

## 5. Data flow summary

```
React (port 5173)
  → useGridStore (Zustand)
  → WebSocketProvider
       → socket.io client → Node gateway (port 8000)
                              → GET /tick every 500ms → Python AI (port 8001)
                              → POST /chaos on button click
       → on 'simulation_tick': applyTick(data)
       → on 'grid_event': pushEvent(evt)
  → OverviewPage / AmmPage / NodePage / ZkTerminalPage
       → MicrogridCanvas reads generation, gridLoad, swapFee, reserves, events
       → Chaos buttons call emit('chaos:cloud_cover') etc.
```

---

## 6. Exact integration hooks for Phase 5

Use these when wiring Hardhat / Web3 / zk-proofs:

| Goal | Where | What to do |
|------|--------|------------|
| **Live ticks from Python** | Already done | Gateway polls `/tick`, emits `simulation_tick`; store applies it. Ensure backend + AI engine run. |
| **Chaos → Python** | Already done | Chaos buttons emit `chaos:*`; gateway maps to `/chaos`. No code change. |
| **Show “LIVE” vs “MOCK”** | `OverviewPage.tsx` (and optionally `TopKPIBar`) | Uses `connected` from `useGridStore`; already shown. |
| **Swap / execute trade** | `AmmPage.tsx` | Call backend `POST /execute-trade` (gateway proxies to Python `/swap`). Add optional MetaMask + contract call for on-chain swap. |
| **Per-node data for 3D** | `useGridStore` + `MicrogridCanvas` | Add `nodes?: ProsumerNodeData[]` to store; fetch from `GET /nodes` on interval or with tick; in Scene use `nodes` if present. |
| **AMM price / reserves from chain** | `AmmPage` or new hook | Call `GET /market-state` (from gateway) or read from Hardhat contract (price, reserves, fee). |
| **zk proof before addLiquidity** | `AmmPage` or Node page | Build proof off-chain (Circom + SnarkJS); then call `addLiquidityWithProof(amountToSell, stableIn, proofA, proofB, proofC)` via ethers + Hardhat. |
| **Wallet / chain ID** | Any page | Add a small Web3 provider (e.g. Wagmi + MetaMask); read `chainId` and account; show in Sidebar or TopKPIBar. |

---

## 7. Files to paste for “Antigravity” or Phase 5 prompts

For a tailored prompt, paste:

1. **App + state + provider**  
   - `App.tsx`  
   - `store/useGridStore.ts`  
   - `providers/WebSocketProvider.tsx`

2. **3D canvas**  
   - `components/three/MicrogridCanvas.tsx`

3. **Chaos**  
   - `components/ui/ChaosPanel.tsx`  
   - Chaos section of `pages/OverviewPage.tsx` (the `CHAOS_BTNS` + `emit(btn.event)` block).

4. **Gateway**  
   - `backend/index.js` (tick loop, chaos forwarding, REST proxies).

This gives the full picture of where placeholder data lives, how the 3D canvas gets state, and how chaos buttons attach to the backend so Phase 5 can add Hardhat, zk-proofs, and optional per-node 3D without guessing.
