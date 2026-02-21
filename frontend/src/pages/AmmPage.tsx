import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
    AreaChart, Area, XAxis, YAxis, Tooltip,
    ResponsiveContainer, ReferenceLine, CartesianGrid,
} from 'recharts'
import { useGridStore } from '../store/useGridStore'
import GlassCard from '../components/ui/GlassCard'

const fadeUp = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] as const },
}

/* ── Pastel Bankio palette for Recharts ── */
const CHART = {
    line: '#2563EB',          // rich blue stroke
    gradA: 'rgba(96,165,250,0.28)',  // soft sky at top
    gradB: 'rgba(96,165,250,0.02)',  // near-transparent at base
    grid: 'rgba(0,0,0,0.04)',       // very subtle grid
    tick: '#94A3B8',
    ref: '#4DA3FF',
}

function buildCurveData(x: number, y: number) {
    const k = x * y
    const pts = []
    for (let xi = x * 0.2; xi <= x * 2.5; xi += x * 0.05)
        pts.push({ x: +xi.toFixed(1), y: +(k / xi).toFixed(2) })
    return pts
}

const CurveTooltip = ({ active, payload, label }:
    { active?: boolean; payload?: { value: number }[]; label?: number }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="glass-card-strong rounded-2xl px-3.5 py-2.5 text-[11px]">
            <p className="text-[#8B93A4]">x = <span className="metric-value font-bold text-[#1A1D23]">{label} kWh</span></p>
            <p className="text-[#8B93A4]">y = <span className="metric-value font-bold text-[#2563EB]">{payload[0]?.value} USDC</span></p>
        </div>
    )
}

interface ZKRow { hash: string; amount: string; status: 'verified' | 'pending' | 'failed'; t: string }
function fakeRows(): ZKRow[] {
    return Array.from({ length: 6 }, (_, i) => ({
        hash: '0x' + Math.random().toString(16).slice(2, 8).toUpperCase(),
        amount: (Math.random() * 15 + 1).toFixed(2) + ' kWh',
        status: i === 0 ? 'pending' : 'verified',
        t: new Date(Date.now() - i * 3100).toLocaleTimeString(),
    }))
}
const ZK_STATUS = {
    verified: { bg: 'rgba(46,125,50,0.10)', dot: '#2E7D32', label: 'Verified' },
    pending: { bg: 'rgba(230,81,0,0.10)', dot: '#E65100', label: 'Pending' },
    failed: { bg: 'rgba(198,40,40,0.10)', dot: '#C62828', label: 'Failed' },
}

export default function AmmPage() {
    const { energyReserve, stableReserve, price, swapFee } = useGridStore()
    const [payAmount, setPayAmount] = useState('10')
    const [executing, setExecuting] = useState(false)
    const [lastTx, setLastTx] = useState<string | null>(null)
    const [zkRows] = useState<ZKRow[]>(fakeRows)

    const curveData = useMemo(() => buildCurveData(energyReserve, stableReserve), [energyReserve, stableReserve])

    const pay = parseFloat(payAmount) || 0
    const receive = pay > 0
        ? ((stableReserve * pay) / (energyReserve + pay)).toFixed(3) : '0.000'
    const slippage = (pay / (energyReserve + pay) * 100).toFixed(2)
    const tvl = (energyReserve * price + stableReserve).toFixed(2)
    const spotPx = (stableReserve / energyReserve).toFixed(5)

    const handleSwap = () => {
        if (executing) return
        setExecuting(true)
        setTimeout(() => {
            setExecuting(false)
            setLastTx('0x' + Math.random().toString(16).slice(2, 12).toUpperCase())
        }, 1700)
    }

    return (
        <motion.div {...fadeUp} className="h-full flex flex-col gap-5">
            <div>
                <h1 className="text-xl font-bold text-[#1A1D23] tracking-tight">AMM Trading Floor</h1>
                <p className="text-[11px] text-[#8B93A4] mt-0.5 uppercase tracking-widest">
                    x · y = k  ·  RL Fee Control  ·  ZK-Verified Settlement
                </p>
            </div>

            <div className="flex-1 grid grid-cols-[1fr_320px] gap-5 min-h-0">

                <div className="flex flex-col gap-5">

                    {/* Bonding Curve — delay 0 */}
                    <GlassCard delay={0} className="rounded-3xl p-5 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-[13px] font-bold text-[#1A1D23]">Bonding Curve</p>
                                <p className="metric-value text-[11px] font-semibold mt-0.5" style={{ color: CHART.line }}>
                                    x · y = {(energyReserve * stableReserve).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </p>
                            </div>
                            <div className="flex gap-6">
                                <div className="text-right">
                                    <p className="text-[9px] text-[#8B93A4] uppercase tracking-widest">Spot Price</p>
                                    <p className="metric-value text-[16px] font-bold text-[#1565C0]">{spotPx}</p>
                                    <p className="text-[9px] text-[#8B93A4]">USDC/kWh</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] text-[#8B93A4] uppercase tracking-widest">TVL</p>
                                    <p className="metric-value text-[16px] font-bold text-[#2E7D32]">${tvl}</p>
                                    <p className="text-[9px] text-[#8B93A4]">USD</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={curveData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={CHART.gradA} />
                                            <stop offset="95%" stopColor={CHART.gradB} />
                                        </linearGradient>
                                    </defs>
                                    {/* Subtle filter for glow on the line */}
                                    <defs>
                                        <filter id="lineGlow" x="-20%" y="-40%" width="140%" height="180%">
                                            <feGaussianBlur stdDeviation="3" result="blur" />
                                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                        </filter>
                                        <linearGradient id="curveGrad2" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="rgba(96,165,250,0.28)" />
                                            <stop offset="95%" stopColor="rgba(96,165,250,0.02)" />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="x" tick={{ fill: CHART.tick, fontSize: 9 }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fill: CHART.tick, fontSize: 9 }} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CurveTooltip />} />
                                    <ReferenceLine
                                        x={parseFloat(energyReserve.toFixed(1))}
                                        stroke={CHART.ref} strokeDasharray="5 3" strokeWidth={1.5}
                                        label={{ value: 'Current', fill: CHART.ref, fontSize: 9, position: 'insideTopRight' }}
                                    />
                                    <Area
                                        type="monotone" dataKey="y"
                                        stroke={CHART.line} strokeWidth={3}
                                        fill="url(#curveGrad2)"
                                        dot={false} strokeLinejoin="round"
                                        activeDot={{ r: 5, fill: CHART.line, strokeWidth: 2, stroke: '#fff' }}
                                        style={{ filter: 'drop-shadow(0 2px 6px rgba(37,99,235,0.35))' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCard>

                    {/* ZK Settlement Ledger — delay 0.1 */}
                    <GlassCard delay={0.1} className="rounded-3xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[13px] font-bold text-[#1A1D23]">ZK Settlement Ledger</p>
                            <span className="text-[9px] font-semibold px-2.5 py-1 rounded-full"
                                style={{ background: 'rgba(77,163,255,0.10)', color: '#1565C0' }}>
                                {zkRows.filter(r => r.status === 'verified').length} verified
                            </span>
                        </div>
                        <div className="space-y-0.5">
                            <div className="grid grid-cols-[24px_1fr_auto_auto] gap-4 px-3 pb-2.5 border-b border-[rgba(0,0,0,0.06)]">
                                {['#', 'Tx Hash', 'Amount', 'Status'].map(h => (
                                    <p key={h} className="text-[8px] uppercase tracking-widest text-[#8B93A4] font-semibold">{h}</p>
                                ))}
                            </div>
                            {zkRows.map((row, i) => {
                                const s = ZK_STATUS[row.status]
                                return (
                                    <motion.div key={row.hash}
                                        initial={{ opacity: 0, x: -6 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 + i * 0.04, duration: 0.3 }}
                                        className="grid grid-cols-[24px_1fr_auto_auto] gap-4 items-center px-3 py-2.5 rounded-xl"
                                        style={{ background: i % 2 === 0 ? 'rgba(0,0,0,0.018)' : 'transparent' }}>
                                        <span className="text-[9px] text-[#8B93A4] font-mono">{i + 1}</span>
                                        <span className="text-[10px] font-mono text-[#1A1D23] truncate">{row.hash}</span>
                                        <span className="metric-value text-[11px] font-bold text-[#2E7D32]">{row.amount}</span>
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                                            style={{ background: s.bg }}>
                                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
                                            <span className="text-[9px] font-semibold" style={{ color: s.dot }}>{s.label}</span>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </GlassCard>
                </div>

                {/* Swap Card + Pool Stats */}
                <div className="flex flex-col gap-5">

                    {/* Swap card — delay 0.06, strong glass */}
                    <GlassCard delay={0.06} strong className="rounded-3xl p-6 flex-1 flex flex-col gap-5 shadow-xl">
                        <div className="flex items-center justify-between">
                            <p className="text-[17px] font-bold text-[#1A1D23]">Swap</p>
                            <span className="metric-value text-[10px] font-semibold px-2.5 py-1 rounded-full"
                                style={{ background: 'rgba(106,27,154,0.08)', color: '#6A1B9A' }}>
                                Fee {swapFee.toFixed(2)}%
                            </span>
                        </div>

                        {/* Pay */}
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-[#8B93A4] mb-2">You Pay</p>
                            <div className="flex items-center gap-3 p-4 rounded-2xl border"
                                style={{ background: 'rgba(0,0,0,0.025)', borderColor: 'rgba(0,0,0,0.08)' }}>
                                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                                    className="flex-1 metric-value text-[28px] font-bold text-[#1A1D23] bg-transparent outline-none w-0" />
                                <div className="flex-shrink-0 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(230,81,0,0.10)' }}>
                                    <p className="text-[9px] text-[#E65100] font-bold">USDC</p>
                                </div>
                            </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex items-center justify-center">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[16px]"
                                style={{ background: 'rgba(77,163,255,0.10)' }}>↓</div>
                        </div>

                        {/* Receive */}
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-[#8B93A4] mb-2">You Receive</p>
                            <div className="flex items-center gap-3 p-4 rounded-2xl border"
                                style={{ background: 'rgba(46,125,50,0.046)', borderColor: 'rgba(46,125,50,0.15)' }}>
                                <p className="flex-1 metric-value text-[28px] font-bold text-[#2E7D32]">{receive}</p>
                                <div className="flex-shrink-0 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(46,125,50,0.10)' }}>
                                    <p className="text-[9px] text-[#2E7D32] font-bold">kWh</p>
                                </div>
                            </div>
                        </div>

                        {/* Fee breakdown */}
                        <div className="rounded-2xl p-3.5 space-y-2"
                            style={{ background: 'rgba(0,0,0,0.025)', border: '1px solid rgba(0,0,0,0.05)' }}>
                            {[
                                { label: 'Swap Fee', value: `${swapFee.toFixed(2)}%`, color: '#6A1B9A' },
                                { label: 'Price Impact', value: `${slippage}%`, color: parseFloat(slippage) > 1 ? '#E65100' : '#2E7D32' },
                                { label: 'Rate', value: `1 USDC = ${pay > 0 ? (parseFloat(receive) / pay).toFixed(4) : '0'} kWh`, color: '#1A1D23' },
                            ].map(r => (
                                <div key={r.label} className="flex justify-between items-center">
                                    <span className="text-[10px] text-[#4B5263]">{r.label}</span>
                                    <span className="metric-value text-[11px] font-bold" style={{ color: r.color }}>{r.value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Execute */}
                        <motion.button onClick={handleSwap} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            disabled={executing || pay <= 0}
                            className="w-full py-4 rounded-2xl font-bold text-[15px] text-white cursor-pointer border-0"
                            style={{
                                background: (executing || pay <= 0)
                                    ? 'rgba(0,0,0,0.08)'
                                    : 'linear-gradient(135deg,#1565C0 0%,#2563EB 55%,#60A5FA 100%)',
                                color: (executing || pay <= 0) ? '#8B93A4' : '#fff',
                                boxShadow: (executing || pay <= 0) ? 'none' : '0 8px 28px rgba(37,99,235,0.38)',
                            }}>
                            {executing ? (
                                <span className="flex items-center justify-center gap-2.5">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Generating ZK Proof…
                                </span>
                            ) : pay <= 0 ? 'Enter amount' : 'Execute Swap →'}
                        </motion.button>

                        {lastTx && (
                            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 justify-center">
                                <span className="w-4 h-4 flex items-center justify-center rounded-full text-[10px]"
                                    style={{ background: 'rgba(46,125,50,0.12)', color: '#2E7D32' }}>✓</span>
                                <p className="text-[10px] text-[#2E7D32] font-mono">{lastTx}</p>
                            </motion.div>
                        )}
                    </GlassCard>

                    {/* Pool Stats — delay 0.14 */}
                    <GlassCard delay={0.14} className="rounded-3xl p-5">
                        <p className="text-[12px] font-bold text-[#1A1D23] mb-3">Pool Reserves</p>
                        {[
                            { label: 'Energy x', val: energyReserve.toFixed(0), unit: 'kWh', color: '#1565C0', pct: Math.min(100, energyReserve / 90) },
                            { label: 'Stable y', val: stableReserve.toFixed(1), unit: 'USDC', color: '#2E7D32', pct: Math.min(100, stableReserve / 20) },
                        ].map(r => (
                            <div key={r.label} className="mb-3 last:mb-0">
                                <div className="flex justify-between mb-1.5">
                                    <span className="text-[10px] text-[#4B5263]">{r.label}</span>
                                    <span className="metric-value text-[11px] font-bold" style={{ color: r.color }}>
                                        {r.val} <span className="text-[9px] font-normal text-[#8B93A4]">{r.unit}</span>
                                    </span>
                                </div>
                                <div className="h-2 rounded-full bg-[rgba(0,0,0,0.05)] overflow-hidden">
                                    <motion.div className="h-full rounded-full"
                                        animate={{ width: `${r.pct}%` }}
                                        style={{ background: `linear-gradient(90deg, ${r.color}77, ${r.color})` }}
                                        transition={{ duration: 0.6, ease: 'easeOut' }} />
                                </div>
                            </div>
                        ))}
                    </GlassCard>
                </div>
            </div>
        </motion.div>
    )
}
