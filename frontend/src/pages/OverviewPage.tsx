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
    const { gridLoad, generation, swapFee, reward, gridImbalance, connected } = useGridStore()
    const emit = useSocketEmit()

    const imbalanceColor = Math.abs(gridImbalance) > 20 ? '#E65100'
        : gridImbalance >= 0 ? '#2E7D32' : '#C62828'

    return (
        <motion.div {...fadeUp} className="h-full grid grid-cols-[1fr_268px] gap-0">

            {/* 3D Canvas — delay 0 */}
            <GlassCard delay={0} hover={false} className="rounded-none overflow-hidden flex flex-col">
                <div className="px-6 pt-4 pb-3 flex items-center justify-between border-b border-[#F3F4F6]">
                    <div>
                        <p className="text-[15px] font-bold text-[#111827] tracking-tight leading-none">Macro Grid</p>
                        <p className="text-[10px] text-[#9CA3AF] uppercase tracking-widest mt-1">
                            Live topology · ZK-Secured · DDPG-Stabilised
                        </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold border"
                        style={connected
                            ? { background: '#F0FDF4', color: '#15803D', borderColor: '#BBF7D0' }
                            : { background: '#FFFBEB', color: '#B45309', borderColor: '#FDE68A' }}>
                        {connected ? 'Live' : 'Mock'}
                    </span>
                </div>
                {/* Canvas fills remaining height */}
                <div className="flex-1 min-h-0" style={{ contain: 'strict', willChange: 'transform' }}>
                    <Suspense fallback={<div className="flex h-full items-center justify-center text-[#8B93A4] text-sm">Loading…</div>}>
                        <MicrogridCanvas />
                    </Suspense>
                </div>
            </GlassCard>

            {/* Right panel */}
            <div className="flex flex-col gap-0">

                {/* AI Telemetry — delay 0.08 */}
                <GlassCard delay={0.08} className="rounded-none p-8">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-1.5 rounded-full animate-pulse-slow bg-[#3B82F6]" />
                        <p className="section-label mb-0 text-[#6B7280]">AI Telemetry</p>
                    </div>

                    {/* Two mini-stat cards */}
                    <div className="grid grid-cols-2 gap-4 mb-5">
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

                    <div className="space-y-3.5">
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

                    <div className="mt-4 rounded-lg p-3"
                        style={{ background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                        <p className="text-[10px] font-mono text-[#6B7280]">
                            {Math.abs(gridImbalance) > 20
                                ? `[DDPG] Correcting Δ${Math.abs(gridImbalance).toFixed(1)} kW…`
                                : '[DDPG] Grid nominal — monitoring'}
                        </p>
                    </div>
                </GlassCard>

                {/* Chaos Engine — delay 0.16 */}
                <GlassCard delay={0.16} className="rounded-none p-8 flex-1">
                    <p className="section-label mb-4">Chaos Engine</p>
                    <div className="grid grid-cols-2 gap-4">
                        {CHAOS_BTNS.map(btn => (
                            <motion.button
                                key={btn.event}
                                whileHover={{ scale: 1.04, boxShadow: btn.shadow }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => emit(btn.event)}
                                className="relative flex flex-col items-start gap-3 p-4 rounded-2xl text-left cursor-pointer outline-none overflow-hidden"
                                style={{
                                    background: btn.gradient,
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                                    border: '1px solid rgba(255,255,255,0.45)',
                                    willChange: 'transform',   /* GPU layer — no layout cost */
                                }}
                            >
                                {/* Inner gloss overlay for glass depth */}
                                <div className="absolute inset-0 rounded-2xl pointer-events-none"
                                    style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.04) 60%, transparent 100%)' }}
                                />
                                <span className="text-[26px] leading-none animate-float relative z-10"
                                    style={{ display: 'inline-block' }}>
                                    {btn.icon}
                                </span>
                                <div className="relative z-10">
                                    <p className="text-sm font-bold leading-tight" style={{ color: btn.text }}>{btn.label}</p>
                                    <p className="text-xs mt-1 font-medium" style={{ color: `${btn.text}99` }}>{btn.desc}</p>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </GlassCard>
            </div>
        </motion.div>
    )
}
