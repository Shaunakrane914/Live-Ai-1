import { create } from 'zustand'
import type { OhlcCandle } from '../hooks/useOhlcAggregator'

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
    gridLoad: number        // kW
    generation: number      // kW
    price: number           // USDC per kWh
    swapFee: number         // % — RL controlled
    energyReserve: number   // AMM energy reserve
    stableReserve: number   // AMM stable reserve
    reward: number          // RL reward scalar
    gridImbalance: number   // generation - gridLoad
    batterySoc: number      // aggregate SoC across all 15 nodes (0–100 %)

    // Phase 5: real per-node data from Python (15 nodes)
    nodes: GridNode[]

    // Connection status
    connected: boolean
    waking: boolean      // Render cold-start — backend waking up
    lastTickAt: number   // epoch ms

    // Event stream (capped at 50)
    events: GridEvent[]

    // OHLC candle history — accumulated from app start (capped at 500)
    ohlcCandles: OhlcCandle[]

    // Zustand actions
    applyTick: (tick: Omit<GridState, 'connected' | 'waking' | 'lastTickAt' | 'events' | 'ohlcCandles' | 'applyTick' | 'pushEvent' | 'setConnected' | 'setWaking' | 'pushOhlcCandle'>) => void
    pushEvent: (event: GridEvent) => void
    setConnected: (v: boolean) => void
    setWaking: (v: boolean) => void
    pushOhlcCandle: (candle: OhlcCandle) => void
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
    batterySoc: 62.4,   // realistic default until first live tick
    nodes: [],
    connected: false,
    waking: false,
    lastTickAt: 0,
    events: [],
    ohlcCandles: [],

    applyTick: (tick) =>
        set((s) => {
            // Destructure to EXCLUDE the Python 'events' field (slash events array)
            // and any other non-state fields from the raw tick payload.
            // The 'events' key on a raw tick is the Python slash array — NOT our
            // Zustand GridEvent[] feed. Spreading it would wipe the feed every tick.
            const { events: _rawSlash, ...metrics } = tick as typeof tick & { events?: unknown }
            void _rawSlash   // acknowledged — handled separately in WebSocketProvider
            return {
                ...s,
                ...metrics,
                // Only update nodes if the tick actually contains node data
                nodes: (metrics as { nodes?: typeof s.nodes }).nodes ?? s.nodes,
                lastTickAt: Date.now(),
            }
        }),

    pushEvent: (event) =>
        set((s) => ({
            events: [event, ...s.events].slice(0, 50),
        })),

    pushOhlcCandle: (candle) =>
        set((s) => ({
            ohlcCandles: [...s.ohlcCandles, candle].slice(-500),
        })),

    setConnected: (v) => set({ connected: v }),
    setWaking: (v) => set({ waking: v }),
}))
