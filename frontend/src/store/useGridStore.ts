import { create } from 'zustand'

// ── Types ─────────────────────────────────────────────────────────
export type EventType = 'SWAP' | 'ZK_VERIFIED' | 'SLASH' | 'CHAOS' | 'LIQUIDITY'

export interface GridEvent {
    id: string
    type: EventType
    message: string
    timestamp: number
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
