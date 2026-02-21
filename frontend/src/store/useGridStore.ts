import { create } from 'zustand'

// ── Types ─────────────────────────────────────────────────────────
export type EventType = 'SWAP' | 'ZK_VERIFIED' | 'SLASH' | 'CHAOS' | 'LIQUIDITY'

export interface GridEvent {
    id: string
    type: EventType
    message: string
    timestamp: number
}

/** Real node data from Python physics (Phase 5) */
export interface GridNode {
    id: string
    current_gen: number
    current_load: number
    battery_soc: number
}

export interface GridState {
    // Live simulation metrics
    gridLoad: number   // kW
    generation: number   // kW
    price: number   // USDC per kWh
    swapFee: number   // % — RL controlled
    energyReserve: number   // AMM energy reserve
    stableReserve: number   // AMM stable reserve
    reward: number   // RL reward scalar
    gridImbalance: number   // generation - gridLoad

    // Phase 5: real per-node data from Python (15 nodes)
    nodes: GridNode[]

    // Connection status
    connected: boolean
    lastTickAt: number   // epoch ms

    // Event stream (capped at 50)
    events: GridEvent[]

    // Zustand actions
    applyTick: (tick: Omit<GridState, 'connected' | 'lastTickAt' | 'events' | 'applyTick' | 'pushEvent' | 'setConnected'>) => void
    pushEvent: (event: GridEvent) => void
    setConnected: (v: boolean) => void
}

// ── Store ──────────────────────────────────────────────────────────
export const useGridStore = create<GridState>((set) => ({
    gridLoad: 142.7,
    generation: 158.3,
    price: 0.0842,
    swapFee: 1.34,
    energyReserve: 5000,
    stableReserve: 421,
    reward: 0.847,
    gridImbalance: 15.6,
    nodes: [],
    connected: false,
    lastTickAt: 0,
    events: [],

    applyTick: (tick) =>
        set((s) => ({
            ...s,
            ...tick,
            lastTickAt: Date.now(),
        })),

    pushEvent: (event) =>
        set((s) => ({
            events: [event, ...s.events].slice(0, 50),
        })),

    setConnected: (v) => set({ connected: v }),
}))
