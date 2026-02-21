import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGridStore } from '../store/useGridStore'
import CircularGauge from '../components/ui/CircularGauge'
import AutoAegisToggle from '../components/ui/AutoAegisToggle'

const fadeUp = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
}

export default function NodePage() {
    const { id } = useParams()
    const navigate = useNavigate()
    // 3D canvas uses 0-based indexing; default to 0
    const nodeId = Math.max(0, Math.min(14, parseInt(id ?? '0')))
    const [aegisActive, setAegisActive] = useState(false)

    const { generation, gridLoad, swapFee, energyReserve, stableReserve, nodes: storeNodes } = useGridStore()

    // ── Use real per-node data from WebSocket when available ──────────
    const liveNode = storeNodes?.[nodeId]
    const nodeGen = liveNode ? liveNode.current_gen : generation * (0.06 + Math.sin(nodeId * 1.7) * 0.04)
    const nodeLoad = liveNode ? liveNode.current_load : gridLoad * (0.06 + Math.cos(nodeId * 2.1) * 0.03)
    const batSoc = liveNode ? liveNode.battery_soc : 30 + (Math.sin(nodeId * 1.1) * 0.5 + 0.5) * 65

    const usdcBal = (energyReserve / 100 * (0.5 + nodeId * 0.1)).toFixed(2)
    const lpTokens = (stableReserve / 10 * (0.5 + nodeId * 0.08)).toFixed(2)
    const collat = (parseFloat(usdcBal) * 1.5).toFixed(2)
    const pnl = ((nodeGen - nodeLoad) * swapFee * 0.1).toFixed(3)

    return (
        <motion.div {...fadeUp} className="h-full flex flex-col gap-4">
            {/* Header + nav */}
            <div className="flex items-center justify-between">
                <div>
                    {/* Breadcrumb back button */}
                    <button
                        onClick={() => navigate('/overview')}
                        className="text-[10px] text-[#4DA3FF] mb-1 hover:underline flex items-center gap-1"
                    >
                        ← Grid Overview
                    </button>
                    <h1 className="text-xl font-bold text-[#1A1D23] tracking-tight">Prosumer Node #{nodeId}</h1>
                    <p className="text-[11px] text-[#8B93A4] uppercase tracking-wider">
                        On-chain prosumer · ZK-verified trades · DDPG agent
                        {liveNode && <span className="ml-2 text-[#00A152]">● LIVE</span>}
                    </p>
                </div>
                {/* Compact node switcher — all 15 nodes */}
                <div className="flex flex-wrap gap-1 max-w-[200px] justify-end">
                    {Array.from({ length: 15 }, (_, n) => (
                        <motion.button key={n} whileTap={{ scale: 0.92 }}
                            onClick={() => navigate(`/node/${n}`)}
                            className="w-7 h-7 rounded-lg text-[10px] font-bold transition-colors"
                            style={{
                                background: n === nodeId ? '#4DA3FF' : 'rgba(77,163,255,0.10)',
                                color: n === nodeId ? '#fff' : '#4DA3FF',
                            }}>
                            {n}
                        </motion.button>
                    ))}
                </div>
            </div>

            <div className="flex-1 grid grid-cols-[1fr_280px] gap-4 min-h-0">

                {/* Left: gauges + auto-aegis */}
                <div className="flex flex-col gap-4">
                    {/* Circular gauges */}
                    <div className="glass-card rounded-2xl p-6">
                        <p className="section-label mb-5">Node Telemetry</p>
                        <div className="flex justify-around">
                            <CircularGauge value={nodeGen} max={30} label="Solar Yield" unit="kW"
                                color="#F59E0B" size={120} icon="☀" />
                            <CircularGauge value={nodeLoad} max={30} label="Consumption" unit="kW"
                                color="#2563EB" size={120} icon="⚡" />
                            <CircularGauge value={batSoc} max={100} label="Battery SoC" unit="%"
                                color="#00A152" size={120} icon="🔋" />
                        </div>
                    </div>

                    {/* Auto-Aegis + ZK terminal */}
                    <div className="glass-card rounded-2xl p-5 flex-1">
                        <AutoAegisToggle active={aegisActive} onToggle={() => setAegisActive(v => !v)} />

                        {aegisActive && (
                            <div className="mt-4 rounded-xl p-3 overflow-y-auto max-h-[180px]"
                                style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.07)' }}>
                                <p className="section-label mb-2 text-[#2563EB]">ZK Proof Terminal</p>
                                {[
                                    '$ generate_witness circuit.r1cs input.json',
                                    '  [OK] Witness generated (1.2ms)',
                                    '$ plonk_prove witness.wtns',
                                    '  [OK] Proof generated (18ms)',
                                    '$ verify_onchain 0x4ae1…',
                                    '  [✓] Proof valid — tx confirmed',
                                ].map((line, i) => (
                                    <motion.p key={i} initial={{ opacity: 0, x: -4 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.12 }}
                                        className="text-[9px] font-mono leading-relaxed"
                                        style={{ color: line.startsWith('  [✓]') ? '#00A152' : line.startsWith('  [OK]') ? '#2563EB' : '#4B5263' }}>
                                        {line}
                                    </motion.p>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: wallet panel */}
                <div className="glass-card rounded-2xl p-5">
                    <p className="section-label mb-4">Wallet</p>
                    <div className="space-y-3">
                        {[
                            { label: 'USDC Balance', value: `$${usdcBal}`, color: '#1A1D23' },
                            { label: 'LP Tokens', value: lpTokens, color: '#2563EB' },
                            { label: 'Collateral', value: `$${collat}`, color: '#F59E0B' },
                            {
                                label: 'Net P&L', value: `${parseFloat(pnl) >= 0 ? '+' : ''}${pnl} USDC`,
                                color: parseFloat(pnl) >= 0 ? '#00A152' : '#EF4444'
                            },
                        ].map(item => (
                            <div key={item.label}
                                className="flex justify-between items-center py-2.5 px-3 rounded-xl"
                                style={{ background: 'rgba(0,0,0,0.025)' }}>
                                <span className="text-[11px] text-[#4B5263]">{item.label}</span>
                                <span className="metric-value text-[13px] font-bold" style={{ color: item.color }}>
                                    {item.value}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Simulated stake bar */}
                    <div className="mt-5">
                        <p className="section-label mb-2">Stake Health</p>
                        <div className="h-2 rounded-full bg-[rgba(0,0,0,0.06)] overflow-hidden">
                            <motion.div className="h-full rounded-full"
                                animate={{ width: `${Math.min(100, (batSoc * 0.8)).toFixed(0)}%` }}
                                style={{ background: 'linear-gradient(90deg, #4DA3FF, #00A152)' }}
                                transition={{ duration: 0.6, ease: 'easeOut' }} />
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className="text-[9px] text-[#8B93A4]">At-risk</span>
                            <span className="text-[9px] text-[#8B93A4]">Healthy</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
