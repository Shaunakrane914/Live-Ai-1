import {
    createContext, useContext, useEffect, useRef,
    type ReactNode,
} from 'react'
import { io, type Socket } from 'socket.io-client'
import { useGridStore, type EventType, type GridEvent } from '../store/useGridStore'

// ── Config ─────────────────────────────────────────────────────────
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000'
const MOCK_INTERVAL = 500
const EVENT_TYPES: EventType[] = ['SWAP', 'ZK_VERIFIED', 'SLASH', 'CHAOS', 'LIQUIDITY']

// ── Mock helpers ───────────────────────────────────────────────────
let _mockGeneration = 158.3, _mockPrice = 0.0842, _mockSwapFee = 1.34
let _mockEnergy = 5000, _mockStable = 421, _mockReward = 0.847
let _eventCounter = 0

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
    return {
        gridLoad: load, generation: _mockGeneration,
        price: parseFloat(_mockPrice.toFixed(4)),
        swapFee: parseFloat(_mockSwapFee.toFixed(3)),
        energyReserve: parseFloat(_mockEnergy.toFixed(1)),
        stableReserve: parseFloat(_mockStable.toFixed(1)),
        reward: parseFloat(_mockReward.toFixed(3)),
        gridImbalance: parseFloat(imbalance.toFixed(2)),
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
    return { id: `evt-${++_eventCounter}-${Date.now()}`, type, message: EVENT_MESSAGES[type](), timestamp: Date.now() }
}

// ── Context — expose socket emit ───────────────────────────────────
interface SocketContextValue {
    emit: (event: string, data?: unknown) => void
}

const SocketContext = createContext<SocketContextValue>({ emit: () => { } })

export function useSocketEmit() {
    return useContext(SocketContext).emit
}

// ── Provider ───────────────────────────────────────────────────────
interface WebSocketProviderProps { children: ReactNode }

export default function WebSocketProvider({ children }: WebSocketProviderProps) {
    const { applyTick, pushEvent, setConnected } = useGridStore()
    const socketRef = useRef<Socket | null>(null)
    const mockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const evtTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    function startMockSimulation() {
        if (mockTimerRef.current) return
        mockTimerRef.current = setInterval(() => applyTick(generateMockTick()), MOCK_INTERVAL)
        evtTimerRef.current = setInterval(() => pushEvent(generateMockEvent()), 2500)
    }

    function stopMockSimulation() {
        if (mockTimerRef.current) { clearInterval(mockTimerRef.current); mockTimerRef.current = null }
        if (evtTimerRef.current) { clearInterval(evtTimerRef.current); evtTimerRef.current = null }
    }

    const socketEmit = (event: string, data?: unknown) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit(event, data)
        } else {
            // In mock mode — simulate the chaos effect locally by injecting an event
            pushEvent({
                id: `chaos-${Date.now()}`,
                type: 'CHAOS',
                message: event.replace('chaos:', '').replace(/_/g, ' ') + ' injected (mock)',
                timestamp: Date.now(),
            })
        }
    }

    useEffect(() => {
        const socket = io(SOCKET_URL, {
            transports: ['websocket'],
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
            timeout: 3000,
        })
        socketRef.current = socket

        socket.on('connect', () => { setConnected(true); stopMockSimulation() })
        socket.on('disconnect', () => { setConnected(false); startMockSimulation() })
        socket.on('connect_error', () => { if (!socketRef.current?.connected) { setConnected(false); startMockSimulation() } })
        socket.on('simulation_tick', (data) => applyTick(data))
        socket.on('grid_event', (evt) => pushEvent(evt))

        startMockSimulation()

        return () => { stopMockSimulation(); socket.disconnect() }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <SocketContext.Provider value={{ emit: socketEmit }}>
            {children}
        </SocketContext.Provider>
    )
}
