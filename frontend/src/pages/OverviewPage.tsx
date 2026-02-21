import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { useGridStore } from '../store/useGridStore'
import { useSocketEmit } from '../providers/WebSocketProvider'
import MicrogridCanvas from '../components/three/MicrogridCanvas'
import GlassCard from '../components/ui/GlassCard'

const fadeUp = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] as const },
}

const CHAOS_BTNS = [
    {
        label: 'Cloud Cover', desc: 'Solar −40%', icon: '☁', event: 'chaos:cloud_cover',
        gradient: 'linear-gradient(135deg,#E3F2FD,#BBDEFB)', shadow: '0 8px 24px rgba(33,150,243,0.22)', text: '#1565C0'
    },
    {
        label: 'Peak Demand', desc: 'Load +60%', icon: '⚡', event: 'chaos:peak_demand',
        gradient: 'linear-gradient(135deg,#FFF8E1,#FFE082)', shadow: '0 8px 24px rgba(245,158,11,0.25)', text: '#B45309'
    },
    {
        label: 'Bad Actor', desc: 'Fraud inject', icon: '👤', event: 'chaos:malicious_actor',
        gradient: 'linear-gradient(135deg,#FFEBEE,#FFCDD2)', shadow: '0 8px 24px rgba(239,68,68,0.20)', text: '#B91C1C'
    },
    {
        label: 'Trade Fail', desc: 'Slash trigger', icon: '✕', event: 'chaos:delivery_fail',
        gradient: 'linear-gradient(135deg,#FBE9E7,#FFCCBC)', shadow: '0 8px 24px rgba(249,115,22,0.20)', text: '#C2410C'
    },
]

export default function OverviewPage() {
    const { gridLoad, generation, swapFee, reward, gridImbalance, connected, events } = useGridStore()
    const emit = useSocketEmit()

    const imbalanceColor = Math.abs(gridImbalance) > 20 ? '#E65100'
        : gridImbalance >= 0 ? '#2E7D32' : '#C62828'

    return (
        <motion.div {...fadeUp} className="h-full grid grid-cols-[1fr_260px] grid-rows-[1fr_auto] gap-4">

            {/* 3D Canvas — delay 0 */}
            <GlassCard delay={0} hover={false} className="rounded-3xl overflow-hidden flex flex-col">
                <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-[rgba(0,0,0,0.06)]">
                    <div>
                        <h1 className="text-[16px] font-bold text-[#1A1D23]">Macro Grid</h1>
                        <p className="text-[10px] text-[#8B93A4] uppercase tracking-widest mt-0.5">
                            Live topology · ZK-Secured · DDPG-Stabilised
                        </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                        style={connected
                            ? { background: 'rgba(46,125,50,0.10)', color: '#2E7D32' }
                            : { background: 'rgba(230,81,0,0.10)', color: '#E65100' }}>
                        {connected ? '● LIVE' : '● MOCK'}
                    </span>
                </div>
                {/* Canvas transparent — mesh gradient shows through glass */}
                <div className="flex-1" style={{ minHeight: 320 }}>
                    <Suspense fallback={<div className="flex h-full items-center justify-center text-[#8B93A4] text-sm">Loading…</div>}>
                        <MicrogridCanvas />
                    </Suspense>
                </div>
            </GlassCard>

            {/* Right panel */}
            <div className="flex flex-col gap-4">

                {/* AI Telemetry — delay 0.08 */}
                <GlassCard delay={0.08} className="rounded-3xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse-slow" style={{ background: '#4DA3FF' }} />
                        <p className="section-label mb-0">AI Telemetry</p>
                    </div>

                    {/* Two mini-stat cards */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        {[
                            {
                                label: 'Imbalance', value: `${gridImbalance >= 0 ? '+' : ''}${gridImbalance.toFixed(2)}`, unit: 'kW',
                                color: imbalanceColor, bg: `${imbalanceColor}10`
                            },
                            {
                                label: 'RL Reward', value: reward.toFixed(3), unit: '',
                                color: '#2E7D32', bg: 'rgba(232,245,233,0.65)'
                            },
                        ].map(m => (
                            <div key={m.label} className="rounded-2xl p-3 border"
                                style={{ background: m.bg, borderColor: `${m.color}20` }}>
                                <span className="text-[9px] uppercase tracking-wider font-semibold block"
                                    style={{ color: `${m.color}99` }}>{m.label}</span>
                                <span className="metric-value text-[18px] font-bold block leading-tight" style={{ color: m.color }}>
                                    {m.value}
                                </span>
                                {m.unit && <span className="text-[9px]" style={{ color: `${m.color}77` }}>{m.unit}</span>}
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2">
                        {[
                            { label: 'Generation', value: `${generation.toFixed(1)} kW`, color: '#0277BD' },
                            { label: 'Grid Load', value: `${gridLoad.toFixed(1)} kW`, color: '#1A1D23' },
                            { label: 'Swap Fee', value: `${swapFee.toFixed(2)}%`, color: '#6A1B9A' },
                        ].map(r => (
                            <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-[rgba(0,0,0,0.05)] last:border-0">
                                <span className="text-[11px] text-[#4B5263]">{r.label}</span>
                                <span className="metric-value text-[12px] font-bold" style={{ color: r.color }}>{r.value}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-3 rounded-2xl p-2.5"
                        style={{ background: 'rgba(77,163,255,0.06)', border: '1px solid rgba(77,163,255,0.12)' }}>
                        <p className="text-[10px] font-mono text-[#1565C0]">
                            {Math.abs(gridImbalance) > 20
                                ? `[DDPG] Correcting Δ${Math.abs(gridImbalance).toFixed(1)} kW…`
                                : '[DDPG] Grid nominal — monitoring'}
                        </p>
                    </div>
                </GlassCard>

                {/* Chaos Engine — delay 0.16 */}
                <GlassCard delay={0.16} className="rounded-3xl p-5 flex-1">
                    <p className="section-label mb-4">Chaos Engine</p>
                    <div className="grid grid-cols-2 gap-2.5">
                        {CHAOS_BTNS.map(btn => (
                            <motion.button
                                key={btn.event}
                                whileHover={{ scale: 1.05, boxShadow: btn.shadow }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => emit(btn.event)}
                                className="flex flex-col items-start gap-2 p-3.5 rounded-2xl text-left cursor-pointer border-0 outline-none"
                                style={{ background: btn.gradient, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                            >
                                <span className="text-[22px] leading-none animate-float" style={{ display: 'inline-block' }}>
                                    {btn.icon}
                                </span>
                                <div>
                                    <p className="text-[11px] font-bold" style={{ color: btn.text }}>{btn.label}</p>
                                    <p className="text-[9px] mt-0.5" style={{ color: `${btn.text}99` }}>{btn.desc}</p>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </GlassCard>
            </div>

            {/* Event Ticker — delay 0.22 */}
            <GlassCard delay={0.22} hover={false} className="col-span-2 rounded-2xl h-9 flex items-center overflow-hidden px-4">
                <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-widest text-[#0277BD] mr-4">LIVE ·</span>
                <div className="overflow-hidden flex-1">
                    {events.length > 0 ? (
                        <div className="ticker-content text-[10px] font-mono text-[#4B5263]">
                            {[...events, ...events].map((e, i) => (
                                <span key={`${e.id}-${i}`} className="inline-flex items-center gap-1.5">
                                    <span className={`badge-${e.type} px-1.5 py-0.5 rounded-md font-bold text-[9px]`}>[{e.type}]</span>
                                    {e.message}<span className="mx-3 opacity-30">·</span>
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[9px] text-[#8B93A4] font-mono">Awaiting events…</p>
                    )}
                </div>
            </GlassCard>
        </motion.div>
    )
}
