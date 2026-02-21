import {
    useEffect, useRef,
    type ReactNode,
} from 'react'
import { io, type Socket } from 'socket.io-client'
import { useGridStore, type EventType, type GridEvent } from '../store/useGridStore'
import { useOhlcAggregator } from '../hooks/useOhlcAggregator'
import { SocketContext } from './SocketContext'

// ── Config ─────────────────────────────────────────────────────────
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000'
const MOCK_INTERVAL = 500
const EVENT_TYPES: EventType[] = ['SWAP', 'ZK_VERIFIED', 'SLASH', 'CHAOS', 'LIQUIDITY']

// ── Debug logger (always on so we can see what's happening) ────────
const log = {
    info: (...a: unknown[]) => console.log('%c[GridiumWS]', 'color:#4DA3FF;font-weight:bold', ...a),
    warn: (...a: unknown[]) => console.warn('%c[GridiumWS]', 'color:#FF9100;font-weight:bold', ...a),
    event: (...a: unknown[]) => console.log('%c[EVENT]', 'color:#00C853;font-weight:bold', ...a),
    tick: (...a: unknown[]) => console.debug('%c[TICK]', 'color:#8B93A4;font-weight:bold', ...a),
    slash: (...a: unknown[]) => console.log('%c[SLASH 🔴]', 'color:#FF6B6B;font-weight:bold', ...a),
}

// ── Mock helpers ───────────────────────────────────────────────────
let _mockGeneration = 158.3, _mockPrice = 0.0842, _mockSwapFee = 1.34
let _mockEnergy = 5000, _mockStable = 421, _mockReward = 0.847
let _mockBatterySoc = 62.4
let _eventCounter = 0

// Stable per-node SoC offsets so each node has a plausible unique value
const NODE_SOC_OFFSETS = Array.from({ length: 15 }, (_, i) => Math.sin(i * 1.1) * 22)

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }
function jitter(base: number, pct = 0.02) { return base + base * (Math.random() * pct * 2 - pct) }

function generateMockTick() {
    _mockGeneration = clamp(jitter(_mockGeneration, 0.015), 80, 220)
    const load = clamp(jitter(_mockGeneration * 0.91, 0.02), 60, 210)
    const imbalance = _mockGeneration - load
    const stress = Math.abs(imbalance) / _mockGeneration
    _mockSwapFee = clamp(_mockSwapFee + (stress > 0.1 ? 0.05 : -0.02), 0.1, 5)
    _mockReward = clamp(_mockReward + (imbalance > 0 ? 0.01 : -0.015), 0, 1)
    _mockPrice = clamp(_mockStable / _mockEnergy, 0.01, 1)
    _mockEnergy = clamp(_mockEnergy + (Math.random() * 20 - 10), 1000, 9000)
    _mockStable = clamp(_mockStable + (Math.random() * 8 - 4), 100, 2000)
    _mockBatterySoc = clamp(_mockBatterySoc + (Math.random() * 2 - 1), 15, 98)

    const perGen = _mockGeneration / 15
    const perLoad = load / 15
    const nodes = NODE_SOC_OFFSETS.map((offset, i) => ({
        id: `node_${i}`,
        current_gen: parseFloat((perGen * (0.7 + Math.sin(i * 2.3) * 0.3)).toFixed(2)),
        current_load: parseFloat((perLoad * (0.7 + Math.cos(i * 1.7) * 0.3)).toFixed(2)),
        battery_soc: parseFloat(clamp(_mockBatterySoc + offset, 5, 100).toFixed(1)),
    }))

    return {
        gridLoad: load, generation: _mockGeneration,
        price: parseFloat(_mockPrice.toFixed(4)),
        swapFee: parseFloat(_mockSwapFee.toFixed(3)),
        energyReserve: parseFloat(_mockEnergy.toFixed(1)),
        stableReserve: parseFloat(_mockStable.toFixed(1)),
        reward: parseFloat(_mockReward.toFixed(3)),
        gridImbalance: parseFloat(imbalance.toFixed(2)),
        batterySoc: parseFloat(_mockBatterySoc.toFixed(1)),
        nodes,
    }
}

const EVENT_MESSAGES: Record<EventType, () => string> = {
    SWAP: () => `${(Math.random() * 15 + 1).toFixed(1)} kWh ↔ ${(Math.random() * 50 + 5).toFixed(2)} USDC`,
    ZK_VERIFIED: () => `Proof 0x${Math.random().toString(16).slice(2, 8).toUpperCase()} accepted`,
    SLASH: () => `${(Math.random() * 80 + 10).toFixed(0)} USDC seized from node 0x${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
    CHAOS: () => ['Cloud cover injected', 'Peak demand spike', 'Delivery failure', 'Malicious actor detected'][Math.floor(Math.random() * 4)],
    LIQUIDITY: () => `LP deposit: ${(Math.random() * 200 + 50).toFixed(1)} kWh + ${(Math.random() * 100 + 20).toFixed(2)} USDC`,
}

function generateMockEvent(): GridEvent {
    const type = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)]
    const evt = { id: `evt-${++_eventCounter}-${Date.now()}`, type, message: EVENT_MESSAGES[type](), timestamp: Date.now() }
    if (type === 'SLASH') log.slash('[MOCK]', evt.message)
    else log.event('[MOCK]', type, evt.message)
    return evt
}

// ── Provider ───────────────────────────────────────────────────────
interface WebSocketProviderProps { children: ReactNode }

export default function WebSocketProvider({ children }: WebSocketProviderProps) {
    const { applyTick, pushEvent, setConnected, pushOhlcCandle } = useGridStore()
    const socketRef = useRef<Socket | null>(null)
    const mockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const evtTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const connectedRef = useRef(false)
    // Delta-tracking: holds the previous tick to detect state changes
    const prevTickRef = useRef<Record<string, number> | null>(null)
    // OHLC aggregator — lives at app level, not page level
    const ohlc = useOhlcAggregator()

    function startMockSimulation() {
        if (mockTimerRef.current) return
        log.warn('Starting MOCK simulation (gateway offline)')
        mockTimerRef.current = setInterval(() => {
            const tick = generateMockTick()
            applyTick(tick)
            const { completed } = ohlc.push(tick.swapFee)
            if (completed) pushOhlcCandle(completed)
        }, MOCK_INTERVAL)
        evtTimerRef.current = setInterval(() => pushEvent(generateMockEvent()), 2500)
    }

    function stopMockSimulation() {
        if (!mockTimerRef.current) return
        log.info('Stopping MOCK simulation (gateway connected)')
        clearInterval(mockTimerRef.current); mockTimerRef.current = null
        clearInterval(evtTimerRef.current!); evtTimerRef.current = null
    }

    const socketEmit = (event: string, data?: unknown) => {
        if (socketRef.current?.connected) {
            log.info(`Emitting ${event}`, data)
            socketRef.current.emit(event, data)
        } else {
            log.warn(`Socket offline — simulating ${event} locally`)
            pushEvent({
                id: `chaos-${Date.now()}`,
                type: 'CHAOS',
                message: event.replace('chaos:', '').replace(/_/g, ' ') + ' injected (mock)',
                timestamp: Date.now(),
            })
        }
    }

    useEffect(() => {
        log.info(`Connecting to gateway at ${SOCKET_URL} …`)

        const socket = io(SOCKET_URL, {
            transports: ['websocket'],
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
            timeout: 3000,
        })
        socketRef.current = socket

        socket.on('connect', () => {
            connectedRef.current = true
            log.info(`✅ Socket connected  id=${socket.id}`)
            setConnected(true)
            stopMockSimulation()   // ← kill mock ONLY on real connect
        })

        socket.on('disconnect', (reason) => {
            connectedRef.current = false
            log.warn(`Socket disconnected — reason: ${reason}`)
            setConnected(false)
            startMockSimulation()
        })

        socket.on('connect_error', (err) => {
            log.warn(`Connection error: ${err.message}`)
            if (!connectedRef.current) {
                setConnected(false)
                startMockSimulation()
            }
        })

        socket.on('simulation_tick', (data) => {
            log.tick('tick', {
                gen: data.generation,
                load: data.gridLoad,
                fee: data.swapFee,
                nodes: data.nodes?.length ?? 'none',
                events: data.events?.length ?? 0,
            })

            // ── 1. Real slash events from Python env ───────────────
            if (Array.isArray(data.events) && data.events.length > 0) {
                data.events.forEach((e: { node?: string; penalty_usdc?: number }) => {
                    const msg = `${e.penalty_usdc ?? '?'} USDC seized from ${e.node ?? 'unknown'}`
                    log.slash('[REAL]', msg)
                    pushEvent({ id: `slash-${Date.now()}-${Math.random()}`, type: 'SLASH', message: msg, timestamp: Date.now() })
                })
            }

            // ── 2. Delta-derived events (State → Event conversion) ──
            const prev = prevTickRef.current
            if (prev) {
                const energyDelta = data.energyReserve - prev.energyReserve
                const feeDelta = data.swapFee - prev.swapFee
                const rewardDelta = (data.reward ?? 0) - (prev.reward ?? 0)

                // AMM Trade detected: energy reserve changed meaningfully
                if (Math.abs(energyDelta) > 0.5) {
                    const side = energyDelta > 0 ? 'sold' : 'bought'
                    const kWh = Math.abs(energyDelta).toFixed(2)
                    const usdc = (Math.abs(energyDelta) * (data.price ?? 0.084)).toFixed(3)
                    const msg = `[CONFIRMED] Node ${side} ${kWh} kWh → ${usdc} USDC @${data.swapFee?.toFixed(2) ?? '?'}% fee`
                    log.event('[Δ-SWAP]', msg)
                    pushEvent({ id: `swap-${Date.now()}`, type: 'SWAP', message: msg, timestamp: Date.now() })
                }

                // DDPG Fee Spike: agent reacted aggressively to instability
                if (feeDelta > 0.5) {
                    const msg = `[AI] DDPG spiked fee +${feeDelta.toFixed(2)}% → ${data.swapFee?.toFixed(2)}% to absorb grid volatility`
                    log.warn('[Δ-AI-SPIKE]', msg)
                    pushEvent({ id: `chaos-${Date.now()}`, type: 'CHAOS', message: msg, timestamp: Date.now() })
                }

                // ZK Settlement: fee eased back (agent stabilised grid) + positive reward
                if (feeDelta < -0.4 && rewardDelta > 0) {
                    const proof = Math.random().toString(16).slice(2, 10).toUpperCase()
                    const msg = `Proof 0x${proof} accepted — DDPG stabilised, fee eased to ${data.swapFee?.toFixed(2)}%`
                    log.event('[Δ-ZK]', msg)
                    pushEvent({ id: `zk-${Date.now()}`, type: 'ZK_VERIFIED', message: msg, timestamp: Date.now() })
                }

                // Liquidity Event: large reserve swing (>50 kWh) — LP rebalancing
                if (Math.abs(energyDelta) > 50) {
                    const kWh = Math.abs(energyDelta).toFixed(1)
                    const usdc = (Math.abs(energyDelta) * (data.price ?? 0.084) * 1.2).toFixed(2)
                    const msg = `LP rebalance: ${kWh} kWh + ${usdc} USDC reserve shift`
                    log.event('[Δ-LP]', msg)
                    pushEvent({ id: `lp-${Date.now()}`, type: 'LIQUIDITY', message: msg, timestamp: Date.now() })
                }
            }

            // ── 3. Store current tick for next delta comparison ─────
            prevTickRef.current = {
                energyReserve: data.energyReserve,
                stableReserve: data.stableReserve,
                swapFee: data.swapFee,
                price: data.price,
                reward: data.reward ?? 0,
            }

            // ── 4. Feed real tick into global OHLC aggregator ───────
            if (data.swapFee != null) {
                const { completed } = ohlc.push(data.swapFee)
                if (completed) pushOhlcCandle(completed)
            }

            applyTick(data)
        })

        socket.on('grid_event', (evt) => {
            if (evt.type === 'SLASH') log.slash('[GATEWAY]', evt.message)
            else log.event('[GATEWAY]', evt.type, evt.message)
            pushEvent(evt)
        })

        // ⚠ DO NOT call startMockSimulation() here — wait for connect_error / disconnect
        // We give the socket 3s to connect before falling back to mock
        const fallbackTimer = setTimeout(() => {
            if (!connectedRef.current) {
                log.warn('3s timeout — gateway unreachable, starting mock')
                startMockSimulation()
            }
        }, 3000)

        return () => {
            clearTimeout(fallbackTimer)
            stopMockSimulation()
            socket.disconnect()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <SocketContext.Provider value={{ emit: socketEmit }}>
            {children}
        </SocketContext.Provider>
    )
}
