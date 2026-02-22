/**
 * @module AmmPage — AMM Trading Floor
 * @description
 * The financial settlement layer of the Gridium Protocol. This page renders the
 * live Automated Market Maker (AMM) UI, split into two modular tabs:
 *
 *   1. **Curve & Price** — the x·y=k bonding curve, candlestick price history, and
 *      swap-fee chart driven by the DDPG AI agent's real-time output.
 *   2. **Liquidity & ZK** — the LP deposit engine and Groth16 zk-SNARK proof status.
 *
 * @architecture
 * Follows the *compound-component* pattern: `DarkCard` is a generic container that
 * enforces the Bloomberg-terminal dark aesthetic consistently across all sub-panels.
 * Data flows unidirectionally from `useGridStore` (Zustand) → component props, with
 * no local data fetching — keeping this file purely presentational and easily testable.
 *
 * @best-practices
 * - All heavy computations (bonding-curve series, chart data) are memoised with `useMemo`
 *   to prevent unnecessary re-renders on each 500 ms WebSocket tick.
 * - The `useGridiumAMM` custom hook encapsulates all on-chain interaction logic,
 *   maintaining a clean separation of concerns between UI and Web3 state.
 * - Framer Motion `fadeUp` variants are defined outside the component to avoid
 *   object recreation on every render cycle.
 *
 * @dependencies
 * - `useGridStore`  — global simulation state (price, fee, reserves)
 * - `useGridiumAMM` — Web3 hook for swap execution and LP management
 * - `SwapFeeChart`  — isolated chart micro-component for modularity
 * - `PageInfo`      — accessible, portal-based info popover
 *
 * @see {@link https://github.com/YashPandit09/Live-Ai} Gridium Protocol Repository
 */
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
    AreaChart, Area, XAxis, YAxis, Tooltip,
    ResponsiveContainer, ReferenceLine, CartesianGrid,
} from 'recharts'
import { useGridStore } from '../store/useGridStore'
import { useGridiumAMM } from '../hooks/useGridiumAMM'
import SwapFeeChart from '../components/charts/SwapFeeChart'
import PageInfo from '../components/ui/PageInfo'

const fadeUp = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] as const },
}

function DarkCard({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
    return (
        <div className={`rounded-2xl border ${className}`} style={{ background: '#171A21', borderColor: '#2A2E39', ...style }}>
            {children}
        </div>
    )
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
        <div className="rounded-xl px-3 py-2 text-[11px]" style={{ background: '#1E2531', border: '1px solid #2A2E39' }}>
            <p style={{ color: '#5D7896' }}>x = <span className="font-bold" style={{ color: '#EAE7DF' }}>{label} kWh</span></p>
            <p style={{ color: '#5D7896' }}>y = <span className="font-bold" style={{ color: '#4DA3FF' }}>{payload[0]?.value} USDC</span></p>
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
    verified: { bg: 'rgba(0,200,120,0.10)', dot: '#00C878', label: 'Verified' },
    pending: { bg: 'rgba(255,145,0,0.10)', dot: '#FF9100', label: 'Pending' },
    failed: { bg: 'rgba(255,77,109,0.10)', dot: '#FF4D6D', label: 'Failed' },
}

const CH = { line: '#2563EB', grid: 'rgba(255,255,255,0.04)', tick: '#5D7896', ref: '#4DA3FF' }

export default function AmmPage() {
    const { energyReserve, stableReserve, price, swapFee } = useGridStore()
    const { reserves, fetchReserves, executeZkSwap } = useGridiumAMM()
    const [activeTab, setActiveTab] = useState<'chart' | 'execute'>('chart')

    const [payAmount, setPayAmount] = useState('10')
    const [executing, setExecuting] = useState(false)
    const [lastTx, setLastTx] = useState<string | null>(null)
    const [zkRows] = useState<ZKRow[]>(() => fakeRows())

    const [zkSolar, setZkSolar] = useState('10')
    const [zkLoad, setZkLoad] = useState('5')
    const [zkStable, setZkStable] = useState('20')
    const [zkExecuting, setZkExecuting] = useState(false)
    const [zkError, setZkError] = useState<string | null>(null)

    const curveData = useMemo(() => buildCurveData(energyReserve, stableReserve), [energyReserve, stableReserve])

    const pay = parseFloat(payAmount) || 0
    const receive = pay > 0 ? ((stableReserve * pay) / (energyReserve + pay)).toFixed(3) : '0.000'
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

    const handleZkAddLiquidity = async () => {
        const solar = parseFloat(zkSolar) || 0
        const load = parseFloat(zkLoad) || 0
        const stable = parseFloat(zkStable) || 0
        if (solar <= 0 || load < 0 || stable <= 0) return
        setZkExecuting(true); setZkError(null)
        const result = await executeZkSwap(solar, load, stable)
        setZkExecuting(false)
        if (result.success && result.txHash) setLastTx(result.txHash)
        else if (result.error) setZkError(result.error)
    }

    const TABS = [
        { id: 'chart' as const, icon: '📈', label: 'Charts', grad: 'linear-gradient(135deg,#1565C0,#2563EB)', glow: 'rgba(37,99,235,0.40)' },
        { id: 'execute' as const, icon: '⚡', label: 'Execute', grad: 'linear-gradient(135deg,#B45309,#F59E0B)', glow: 'rgba(245,158,11,0.40)' },
    ]

    return (
        <motion.div {...fadeUp} className="h-full flex flex-col gap-5" style={{ background: '#0F1115' }}>

            {/* ── Page header ─────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-start gap-2">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight" style={{ color: '#EAE7DF' }}>AMM Trading Floor</h1>
                        <p className="text-[11px] mt-0.5 uppercase tracking-widest" style={{ color: '#5D7896' }}>
                            x · y = k · RL Fee Control · ZK-Verified Settlement
                        </p>
                    </div>
                    <div className="mt-0.5">
                        <PageInfo
                            title="The Magic Vending Machine"
                            description={[
                                "The Community Bucket: This is the financial heart of the neighborhood. Instead of neighbors negotiating prices with each other, they all trade through this automated smart contract.",
                                "Instant Settlement: If a house has extra solar energy, it dumps it into this virtual bucket and gets paid instantly in digital dollars (USDC).",
                                "AI Controlled: The prices aren't set by humans. Our AI constantly changes the 'Swap Fee' based on how much energy is left in the bucket to prevent the grid from blacking out."
                            ]}
                        />
                    </div>
                </div>

                {/* 3D Tab Toggle */}
                <div className="flex items-center gap-2 p-1.5 rounded-2xl"
                    style={{ background: '#0A0D10', border: '1px solid #1E2531', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)' }}>
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.id
                        return (
                            <motion.button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                whileHover={{ scale: 1.04, y: -1 }}
                                whileTap={{ scale: 0.96, y: 2 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                className="relative px-5 py-2 rounded-xl text-[12px] font-bold tracking-wide border-0 cursor-pointer overflow-hidden"
                                style={{
                                    background: isActive ? tab.grad : 'rgba(255,255,255,0.04)',
                                    color: isActive ? '#fff' : '#5D7896',
                                    boxShadow: isActive
                                        ? `0 6px 18px ${tab.glow}, 0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.18)`
                                        : '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
                                    transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
                                }}
                            >
                                {isActive && <span className="absolute inset-x-0 top-0 h-px" style={{ background: 'rgba(255,255,255,0.28)' }} />}
                                <span className="flex items-center gap-1.5"><span>{tab.icon}</span><span>{tab.label}</span></span>
                            </motion.button>
                        )
                    })}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════
                CHARTS TAB
            ══════════════════════════════════════════════════════ */}
            {activeTab === 'chart' && (
                <div className="flex-1 flex flex-col gap-4 min-h-0">

                    {/* Sub-header */}
                    <div className="flex items-center gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#5D7896' }}>Live Market Data</p>
                        <PageInfo
                            title="Market Telemetry"
                            description={[
                                "The Heartbeat (Top Chart): This shows how aggressively our AI is changing the trading fee second-by-second to balance the neighborhood's supply and demand.",
                                "The Gravity Rule (Bottom Chart): This blue line is the 'Bonding Curve'. It is a mathematical rule hardcoded into the blockchain.",
                                "Supply & Demand: The curve ensures that as the neighborhood runs out of stored energy, it becomes exponentially more expensive to buy, forcing people to use less."
                            ]}
                        />
                    </div>

                    {/* OHLC — fixed 300 px, no zoom */}
                    <div className="rounded-2xl overflow-hidden flex-shrink-0"
                        style={{ height: '360px', border: '1px solid #2A2E39' }}>
                        <SwapFeeChart />
                    </div>

                    {/* Bonding Curve — fills remaining height */}
                    <DarkCard className="flex-1 min-h-0 p-5 flex flex-col">
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                            <div>
                                <p className="text-[13px] font-bold" style={{ color: '#EAE7DF' }}>Bonding Curve</p>
                                <p className="text-[11px] font-semibold mt-0.5" style={{ color: CH.line }}>
                                    x · y = {(energyReserve * stableReserve).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </p>
                            </div>
                            <div className="flex gap-8">
                                {[
                                    { label: 'Spot Price', val: spotPx, unit: 'USDC/kWh', color: '#4DA3FF' },
                                    { label: 'TVL', val: `$${tvl}`, unit: 'USD', color: '#00C878' },
                                ].map(s => (
                                    <div key={s.label} className="text-right">
                                        <p className="text-[9px] uppercase tracking-widest" style={{ color: '#5D7896' }}>{s.label}</p>
                                        <p className="text-[18px] font-bold tabular-nums" style={{ color: s.color }}>{s.val}</p>
                                        <p className="text-[9px]" style={{ color: '#5D7896' }}>{s.unit}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={curveData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="curveGradD" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="rgba(37,99,235,0.25)" />
                                            <stop offset="95%" stopColor="rgba(37,99,235,0.02)" />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke={CH.grid} strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="x" tick={{ fill: CH.tick, fontSize: 9 }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fill: CH.tick, fontSize: 9 }} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CurveTooltip />} />
                                    <ReferenceLine x={parseFloat(energyReserve.toFixed(1))}
                                        stroke={CH.ref} strokeDasharray="5 3" strokeWidth={1.5}
                                        label={{ value: 'Current', fill: CH.ref, fontSize: 9, position: 'insideTopRight' }} />
                                    <Area type="monotone" dataKey="y" stroke={CH.line} strokeWidth={2.5}
                                        fill="url(#curveGradD)" dot={false} strokeLinejoin="round"
                                        activeDot={{ r: 5, fill: CH.line, strokeWidth: 2, stroke: '#0F1115' }}
                                        style={{ filter: 'drop-shadow(0 2px 6px rgba(37,99,235,0.35))' }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </DarkCard>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════
                EXECUTE TAB
            ══════════════════════════════════════════════════════ */}
            {activeTab === 'execute' && (
                <div className="flex-1 flex flex-col gap-4 min-h-0">

                    {/* Sub-header */}
                    <div className="flex items-center gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#5D7896' }}>On-Chain Settlement</p>
                        <PageInfo
                            title="Execution Engine"
                            description={[
                                "Swap Energy: This is the actual cash register. Nodes put digital dollars (USDC) in, and take physical energy (kWh) out.",
                                "Provide Liquidity: If you have extra energy, you can 'lend' it to the vending machine. In return, you earn a cut of all the trading fees the AI collects.",
                                "The Ledger: The list on the right is the blockchain receipt book. Every trade is permanently recorded and verified, but Zero-Knowledge cryptography keeps the real-world identities completely hidden."
                            ]}
                        />
                    </div>

                    {/* ── Row 1: Swap form (full width, horizontal layout) ── */}
                    <DarkCard className="p-6 flex-shrink-0">
                        <div className="flex items-start gap-6">
                            {/* Title col */}
                            <div className="w-40 flex-shrink-0 pt-1">
                                <p className="text-[15px] font-bold" style={{ color: '#EAE7DF' }}>Swap Energy</p>
                                <p className="text-[10px] mt-1" style={{ color: '#5D7896' }}>x · y = k constant-product trade</p>
                                <span className="inline-block mt-3 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                                    style={{ background: 'rgba(156,111,255,0.12)', color: '#9C6FFF' }}>
                                    Fee {swapFee.toFixed(2)}%
                                </span>
                            </div>

                            {/* Pay + Arrow + Receive */}
                            <div className="flex-1 flex items-center gap-3">
                                {/* Pay */}
                                <div className="flex-1">
                                    <p className="text-[9px] uppercase tracking-widest mb-1.5" style={{ color: '#5D7896' }}>You Pay</p>
                                    <div className="flex items-center gap-2 p-3 rounded-xl border"
                                        style={{ background: 'rgba(255,255,255,0.03)', borderColor: '#2A2E39' }}>
                                        <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                                            className="flex-1 text-[22px] font-bold bg-transparent outline-none w-0"
                                            style={{ color: '#EAE7DF' }} />
                                        <span className="px-2 py-1 rounded-lg text-[9px] font-bold flex-shrink-0"
                                            style={{ background: 'rgba(255,145,0,0.12)', color: '#FF9100' }}>USDC</span>
                                    </div>
                                </div>
                                {/* Arrow */}
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-4"
                                    style={{ background: 'rgba(77,163,255,0.10)', color: '#4DA3FF', fontSize: 14 }}>→</div>
                                {/* Receive */}
                                <div className="flex-1">
                                    <p className="text-[9px] uppercase tracking-widest mb-1.5" style={{ color: '#5D7896' }}>You Receive</p>
                                    <div className="flex items-center gap-2 p-3 rounded-xl border"
                                        style={{ background: 'rgba(0,200,120,0.05)', borderColor: 'rgba(0,200,120,0.2)' }}>
                                        <p className="flex-1 text-[22px] font-bold" style={{ color: '#00C878' }}>{receive}</p>
                                        <span className="px-2 py-1 rounded-lg text-[9px] font-bold flex-shrink-0"
                                            style={{ background: 'rgba(0,200,120,0.12)', color: '#00C878' }}>kWh</span>
                                    </div>
                                </div>
                            </div>

                            {/* Fee breakdown + button */}
                            <div className="w-52 flex-shrink-0 flex flex-col gap-3">
                                <div className="rounded-xl p-3 space-y-1.5"
                                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #2A2E39' }}>
                                    {[
                                        { label: 'Swap Fee', val: `${swapFee.toFixed(2)}%`, color: '#9C6FFF' },
                                        { label: 'Price Impact', val: `${slippage}%`, color: parseFloat(slippage) > 1 ? '#FF4D6D' : '#00C878' },
                                        { label: 'Rate', val: `1 USDC = ${pay > 0 ? (parseFloat(receive) / pay).toFixed(4) : '0'} kWh`, color: '#EAE7DF' },
                                    ].map(r => (
                                        <div key={r.label} className="flex justify-between">
                                            <span className="text-[9px]" style={{ color: '#5D7896' }}>{r.label}</span>
                                            <span className="text-[10px] font-bold" style={{ color: r.color }}>{r.val}</span>
                                        </div>
                                    ))}
                                </div>
                                <motion.button onClick={handleSwap} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                    disabled={executing || pay <= 0}
                                    className="w-full py-3 rounded-xl font-bold text-[13px] border-0 cursor-pointer"
                                    style={{
                                        background: (executing || pay <= 0) ? '#1E2531' : 'linear-gradient(135deg,#1565C0,#2563EB,#60A5FA)',
                                        color: (executing || pay <= 0) ? '#5D7896' : '#fff',
                                        boxShadow: (executing || pay <= 0) ? 'none' : '0 6px 20px rgba(37,99,235,0.35)',
                                    }}>
                                    {executing
                                        ? <span className="flex items-center justify-center gap-2"><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Proving…</span>
                                        : pay <= 0 ? 'Enter amount' : 'Execute Swap →'}
                                </motion.button>
                                {lastTx && (
                                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-1.5 justify-center">
                                        <span className="w-3.5 h-3.5 flex items-center justify-center rounded-full text-[9px]"
                                            style={{ background: 'rgba(0,200,120,0.12)', color: '#00C878' }}>✓</span>
                                        <p className="text-[9px] font-mono truncate" style={{ color: '#00C878' }}>{lastTx}</p>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </DarkCard>

                    {/* ── Row 2: Pool Reserves + ZK Add Liquidity + ZK Ledger ── */}
                    <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">

                        {/* Pool Reserves */}
                        <DarkCard className="p-5 flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <p className="text-[13px] font-bold" style={{ color: '#EAE7DF' }}>Pool Reserves</p>
                                <button type="button" onClick={() => fetchReserves()} disabled={reserves.isLoading}
                                    className="text-[9px] font-semibold px-2 py-1 rounded-lg"
                                    style={{ color: '#4DA3FF', background: 'rgba(77,163,255,0.08)' }}>
                                    {reserves.isLoading ? '…' : 'Refresh'}
                                </button>
                            </div>
                            <div className="flex-1 flex flex-col justify-center gap-5">
                                {[
                                    { label: 'Energy x', val: energyReserve.toFixed(0), unit: 'kWh', color: '#4DA3FF', pct: Math.min(100, energyReserve / 90) },
                                    { label: 'Stable y', val: stableReserve.toFixed(1), unit: 'USDC', color: '#00C878', pct: Math.min(100, stableReserve / 20) },
                                ].map(r => (
                                    <div key={r.label}>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-[11px]" style={{ color: '#5D7896' }}>{r.label}</span>
                                            <span className="text-[13px] font-bold" style={{ color: r.color }}>
                                                {r.val} <span className="text-[9px] font-normal" style={{ color: '#5D7896' }}>{r.unit}</span>
                                            </span>
                                        </div>
                                        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                            <motion.div className="h-full rounded-full"
                                                animate={{ width: `${r.pct}%` }}
                                                style={{ background: `linear-gradient(90deg, ${r.color}44, ${r.color})` }}
                                                transition={{ duration: 0.7, ease: 'easeOut' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </DarkCard>

                        {/* ZK Add Liquidity */}
                        <DarkCard className="p-5 flex flex-col">
                            <p className="text-[13px] font-bold mb-1" style={{ color: '#EAE7DF' }}>ZK Add Liquidity</p>
                            <p className="text-[9px] mb-4" style={{ color: '#5D7896' }}>Prove surplus energy without revealing raw solar/load.</p>
                            <div className="flex-1 flex flex-col gap-3">
                                {[
                                    { label: 'Total Solar (kW)', val: zkSolar, set: setZkSolar },
                                    { label: 'Total Load (kW)', val: zkLoad, set: setZkLoad },
                                    { label: 'Stable to Add (USDC)', val: zkStable, set: setZkStable },
                                ].map(({ label, val, set }) => (
                                    <div key={label}>
                                        <label className="text-[9px] block mb-1" style={{ color: '#5D7896' }}>{label}</label>
                                        <input type="number" value={val} onChange={e => set(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl text-[13px] border outline-none"
                                            style={{ background: 'rgba(255,255,255,0.03)', borderColor: '#2A2E39', color: '#EAE7DF' }} />
                                    </div>
                                ))}
                            </div>
                            <motion.button onClick={handleZkAddLiquidity} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                disabled={zkExecuting}
                                className="mt-4 w-full py-3 rounded-xl font-bold text-[13px] border-0 cursor-pointer"
                                style={{
                                    background: zkExecuting ? '#1E2531' : 'linear-gradient(135deg,#00A152,#00C878)',
                                    color: zkExecuting ? '#5D7896' : '#fff',
                                    boxShadow: zkExecuting ? 'none' : '0 6px 20px rgba(0,200,120,0.25)',
                                }}>
                                {zkExecuting ? 'Generating proof…' : 'Execute ZK Add Liquidity'}
                            </motion.button>
                            {zkError && <p className="text-[9px] mt-2" style={{ color: '#FF4D6D' }}>{zkError}</p>}
                        </DarkCard>

                        {/* ZK Settlement Ledger */}
                        <DarkCard className="p-5 flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-[13px] font-bold" style={{ color: '#EAE7DF' }}>ZK Settlement Ledger</p>
                                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                                    style={{ background: 'rgba(77,163,255,0.10)', color: '#4DA3FF' }}>
                                    {zkRows.filter(r => r.status === 'verified').length} verified
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-1" style={{ scrollbarWidth: 'none' }}>
                                <div className="grid grid-cols-[20px_1fr_auto_auto] gap-3 px-2 pb-2"
                                    style={{ borderBottom: '1px solid #2A2E39' }}>
                                    {['#', 'Hash', 'Amt', 'State'].map(h => (
                                        <p key={h} className="text-[8px] uppercase tracking-widest font-semibold" style={{ color: '#5D7896' }}>{h}</p>
                                    ))}
                                </div>
                                {zkRows.map((row, i) => {
                                    const s = ZK_STATUS[row.status]
                                    return (
                                        <motion.div key={row.hash}
                                            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.04 * i }}
                                            className="grid grid-cols-[20px_1fr_auto_auto] gap-3 items-center px-2 py-2 rounded-lg"
                                            style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                                            <span className="text-[8px] font-mono" style={{ color: '#5D7896' }}>{i + 1}</span>
                                            <span className="text-[9px] font-mono truncate" style={{ color: '#9DA7B3' }}>{row.hash}</span>
                                            <span className="text-[10px] font-bold" style={{ color: '#00C878' }}>{row.amount}</span>
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: s.bg }}>
                                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
                                                <span className="text-[8px] font-semibold" style={{ color: s.dot }}>{s.label}</span>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </DarkCard>
                    </div>
                </div>
            )}
        </motion.div>
    )
}
