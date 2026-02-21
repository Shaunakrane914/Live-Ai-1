import { motion } from 'framer-motion'
import { useGridStore } from '../store/useGridStore'

const fadeUp = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
}

const TYPE_COLOR: Record<string, string> = {
    SWAP: '#4DA3FF', ZK_VERIFIED: '#00C853', SLASH: '#EF4444', CHAOS: '#F59E0B', LIQUIDITY: '#9C6FFF',
}

export default function ZkTerminalPage() {
    const { events, energyReserve, stableReserve } = useGridStore()
    const slashEvents = events.filter(e => e.type === 'SLASH')
    const verifiedEvents = events.filter(e => e.type === 'ZK_VERIFIED')

    return (
        <motion.div {...fadeUp} className="h-full flex flex-col gap-4">
            <div>
                <h1 className="text-xl font-bold text-[#1A1D23] tracking-tight">ZK Terminal</h1>
                <p className="text-[11px] text-[#8B93A4] uppercase tracking-wider">
                    Cryptographic proof settlement · On-chain slash registry
                </p>
            </div>

            <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">

                {/* Live event stream */}
                <div className="col-span-2 glass-card rounded-2xl p-4 flex flex-col overflow-hidden">
                    <p className="section-label mb-3">Live Event Stream</p>
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                        {events.length === 0 && (
                            <p className="text-[11px] text-[#8B93A4] font-mono">Awaiting events…</p>
                        )}
                        {events.map(e => (
                            <div key={e.id} className="flex items-start gap-2.5 py-1.5 px-2.5 rounded-xl"
                                style={{ background: `${TYPE_COLOR[e.type] ?? '#8B93A4'}0A` }}>
                                <span className={`mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded badge-${e.type}`}>
                                    {e.type}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] text-[#1A1D23] font-mono truncate">{e.message}</p>
                                    <p className="text-[9px] text-[#8B93A4]">
                                        {new Date(e.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right column */}
                <div className="flex flex-col gap-4">
                    {/* AMM Reserves */}
                    <div className="glass-card rounded-2xl p-4">
                        <p className="section-label mb-3">AMM Reserves</p>
                        {[
                            { label: 'Energy (x)', value: energyReserve.toFixed(1), unit: 'kWh', color: '#2563EB', pct: Math.min(100, energyReserve / 90) },
                            { label: 'Stable (y)', value: stableReserve.toFixed(1), unit: 'USDC', color: '#00A152', pct: Math.min(100, stableReserve / 20) },
                        ].map(r => (
                            <div key={r.label} className="mb-3 last:mb-0">
                                <div className="flex justify-between mb-1">
                                    <span className="text-[10px] text-[#4B5263]">{r.label}</span>
                                    <span className="metric-value text-[11px] font-bold" style={{ color: r.color }}>
                                        {r.value} {r.unit}
                                    </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-[rgba(0,0,0,0.06)] overflow-hidden">
                                    <motion.div className="h-full rounded-full"
                                        animate={{ width: `${r.pct}%` }}
                                        style={{ background: r.color, opacity: 0.7 }}
                                        transition={{ duration: 0.5, ease: 'easeOut' }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Slash registry */}
                    <div className="glass-card rounded-2xl p-4 flex-1 overflow-hidden flex flex-col">
                        <p className="section-label mb-2">Slash Registry</p>
                        <div className="flex-1 overflow-y-auto space-y-1.5">
                            {slashEvents.length === 0 && (
                                <p className="text-[10px] text-[#8B93A4] font-mono">No slashes yet</p>
                            )}
                            {slashEvents.map(e => (
                                <div key={e.id} className="py-1.5 px-2.5 rounded-xl"
                                    style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
                                    <p className="text-[10px] font-mono text-[#EF4444]">{e.message}</p>
                                    <p className="text-[9px] text-[#8B93A4]">{new Date(e.timestamp).toLocaleTimeString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ZK Verified count */}
                    <div className="glass-card rounded-2xl p-4 text-center">
                        <p className="section-label mb-1">ZK Proofs Verified</p>
                        <p className="metric-value text-[36px] font-bold text-[#00A152]">
                            {verifiedEvents.length}
                        </p>
                        <p className="text-[9px] text-[#8B93A4]">Since session start</p>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
