/**
 * TxFeed — Etherscan-style live transaction feed
 * ─────────────────────────────────────────────────
 * Reads from the Zustand event store (real WebSocket events or mock).
 * Each event type maps to an Etherscan-style row:
 *   SWAP      → kWh ↔ USDC trade
 *   ZK_VERIFIED → proof verified
 *   SLASH     → penalty seized (red highlight)
 *   CHAOS     → chaos injection
 *   LIQUIDITY → LP deposit
 */

import { useGridStore, type GridEvent, type EventType } from '../../store/useGridStore'
import { motion, AnimatePresence } from 'framer-motion'

// ── Event type config ─────────────────────────────────────────────
const TYPE_META: Record<EventType, {
    label: string
    icon: string
    color: string
    bg: string
    dotColor: string
}> = {
    SWAP: {
        label: 'SWAP',
        icon: '⇄',
        color: '#2563EB',
        bg: 'rgba(37,99,235,0.07)',
        dotColor: '#60A5FA',
    },
    ZK_VERIFIED: {
        label: 'ZK PROOF',
        icon: '🔐',
        color: '#7C3AED',
        bg: 'rgba(124,58,237,0.07)',
        dotColor: '#A78BFA',
    },
    SLASH: {
        label: 'SLASH',
        icon: '⚠',
        color: '#DC2626',
        bg: 'rgba(220,38,38,0.10)',
        dotColor: '#F87171',
    },
    CHAOS: {
        label: 'CHAOS',
        icon: '⚡',
        color: '#D97706',
        bg: 'rgba(217,119,6,0.08)',
        dotColor: '#FCD34D',
    },
    LIQUIDITY: {
        label: 'LIQUIDITY',
        icon: '💧',
        color: '#059669',
        bg: 'rgba(5,150,105,0.07)',
        dotColor: '#34D399',
    },
}

// ── Shorten the message for compact display ───────────────────────
function shortId(id: string) {
    // Extract hex-like sequences or make a short hash
    const hex = id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()
    return `0x${hex.slice(0, 4)}…${hex.slice(-4)}`
}

function formatAge(ms: number) {
    const s = Math.floor((Date.now() - ms) / 1000)
    if (s < 60) return `${s}s ago`
    return `${Math.floor(s / 60)}m ago`
}

// ── Single row ────────────────────────────────────────────────────
function TxRow({ event }: { event: GridEvent }) {
    const meta = TYPE_META[event.type]
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
            style={{ background: meta.bg }}
        >
            {/* Type badge */}
            <div className="flex-shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-md border"
                style={{ borderColor: `${meta.color}25`, background: `${meta.color}0D` }}>
                <span className="text-[10px]">{meta.icon}</span>
                <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: meta.color }}>
                    {meta.label}
                </span>
            </div>

            {/* Hash */}
            <span className="text-[9px] font-mono" style={{ color: '#8B93A4' }}>
                {shortId(event.id)}
            </span>

            {/* Message */}
            <span className="flex-1 text-[10px] truncate" style={{ color: '#1A1D23' }}>
                {event.message}
            </span>

            {/* Age */}
            <span className="flex-shrink-0 text-[9px] tabular-nums" style={{ color: '#B0B9C8' }}>
                {formatAge(event.timestamp)}
            </span>

            {/* Status dot */}
            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                style={{ background: meta.dotColor, boxShadow: `0 0 4px ${meta.dotColor}` }} />
        </motion.div>
    )
}

// ── Feed ─────────────────────────────────────────────────────────
export default function TxFeed() {
    const events = useGridStore(s => s.events)

    const totalSwaps = events.filter(e => e.type === 'SWAP').length
    const totalSlash = events.filter(e => e.type === 'SLASH').length
    const totalZk = events.filter(e => e.type === 'ZK_VERIFIED').length

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"
                        style={{ boxShadow: '0 0 5px rgba(52,211,153,0.7)' }} />
                    <span className="text-[11px] font-bold text-[#1A1D23] uppercase tracking-widest">
                        Live Feed
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(0,0,0,0.05)] text-[#8B93A4] font-mono">
                        {events.length}
                    </span>
                </div>
                {/* Mini stats row */}
                <div className="flex items-center gap-3">
                    {[
                        { label: 'SWP', value: totalSwaps, color: '#2563EB' },
                        { label: 'ZK', value: totalZk, color: '#7C3AED' },
                        { label: 'SLH', value: totalSlash, color: '#DC2626' },
                    ].map(s => (
                        <div key={s.label} className="flex items-center gap-1">
                            <span className="text-[8px] uppercase" style={{ color: s.color }}>{s.label}</span>
                            <span className="text-[9px] font-bold font-mono" style={{ color: s.color }}>{s.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Scrollable event list */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 min-h-0"
                style={{ scrollbarWidth: 'none' }}>
                <AnimatePresence initial={false} mode="popLayout">
                    {events.map(evt => (
                        <TxRow key={evt.id} event={evt} />
                    ))}
                </AnimatePresence>

                {events.length === 0 && (
                    <div className="flex items-center justify-center h-24 text-[11px] text-[#B0B9C8]">
                        Waiting for events…
                    </div>
                )}
            </div>
        </div>
    )
}
