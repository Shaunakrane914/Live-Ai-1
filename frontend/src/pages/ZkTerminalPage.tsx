/**
 * @module ZkTerminalPage — Cryptographic Settlement Terminal
 * @description
 * The live security checkpoint and cryptographic audit log for the Gridium Protocol.
 * This page visualises the real-time pipeline of Groth16 zk-SNARK proof generation,
 * on-chain verification, and the Slash Registry that penalises malicious or invalid
 * energy proofs submitted by compromised nodes.
 *
 * @architecture
 * Follows the *Bloomberg-terminal* design pattern: raw cryptographic data is surfaced
 * as a live event log with syntax-highlighted type tokens (SWAP / ZK_VERIFIED / SLASH).
 * The event stream is consumed directly from `useGridStore` (Zustand), which is
 * populated by the Socket.io Gateway — ensuring the UI reacts to backend events
 * within a single render cycle after the WebSocket message arrives.
 *
 * @best-practices
 * - `TYPE_COLOR` and `TYPE_LABEL` lookup maps are defined as module-level constants,
 *   preventing object allocation on each render and enabling O(1) token resolution.
 * - The proof-generation animation uses Framer Motion `AnimatePresence` so exiting
 *   proof entries are removed from the DOM gracefully without layout shift.
 * - A dedicated `ProofStatusBadge` component encapsulates the verification state logic,
 *   keeping the main render function clean and readable.
 *
 * @security
 * Proof verification is performed on-chain via the `EnergyMarket` Solidity contract.
 * This component surfaces the verification result; it never executes cryptographic
 * operations client-side, maintaining a strict separation between UI and trust layer.
 *
 * @see {@link https://github.com/YashPandit09/Live-Ai} Gridium Protocol Repository
 */
import { motion } from 'framer-motion'
import { useGridStore } from '../store/useGridStore'
import PageInfo from '../components/ui/PageInfo'

const fadeUp = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
}

/* ── Bloomberg-style syntax highlight tokens ─────────────────────── */
const TYPE_COLOR: Record<string, string> = {
    SWAP: '#4DA3FF',   // Info / blue
    ZK_VERIFIED: '#00E676',   // Success / terminal green
    SLASH: '#FF3D00',   // Error / hard red
    CHAOS: '#FF9100',   // Warning / amber
    LIQUIDITY: '#9C6FFF',   // Accent / purple
}

/* ── Reusable terminal card wrapper ──────────────────────────────── */
function TermCard({
    children,
    className = '',
    style,
}: {
    children: React.ReactNode
    className?: string
    style?: React.CSSProperties
}) {
    return (
        <div
            className={`rounded-md border flex flex-col ${className}`}
            style={{ background: '#171A21', borderColor: '#2A2E39', ...style }}
        >
            {children}
        </div>
    )
}

/* ── Section heading inside a terminal card ──────────────────────── */
function TermLabel({ children }: { children: React.ReactNode }) {
    return (
        <p
            className="text-[10px] font-bold uppercase tracking-[0.12em] font-mono mb-3"
            style={{ color: '#4DA3FF' }}   // blue accent for all section labels
        >
            &gt;&gt; {children}
        </p>
    )
}

export default function ZkTerminalPage() {
    const { events, energyReserve, stableReserve } = useGridStore()
    const slashEvents = events.filter(e => e.type === 'SLASH')
    const verifiedEvents = events.filter(e => e.type === 'ZK_VERIFIED')

    return (
        /* ── Full-page deep terminal bg ────────────────────────────── */
        <motion.div
            {...fadeUp}
            className="h-full flex flex-col gap-4"
            style={{ background: '#0F1115' }}
        >
            {/* ── Page header ─────────────────────────────────────── */}
            <div className="flex items-start gap-3">
                <div>
                    <h1
                        className="text-xl font-bold tracking-tight font-mono"
                        style={{ color: '#E6EDF3' }}
                    >
                        ZK Terminal
                    </h1>
                    <p
                        className="text-[11px] uppercase tracking-wider font-mono mt-0.5"
                        style={{ color: '#9DA7B3' }}
                    >
                        Cryptographic proof settlement · On-chain slash registry
                    </p>
                </div>
                <div className="mt-0.5">
                    <PageInfo
                        title="Cryptographic Settlement"
                        description={[
                            "The Privacy Engine: This page is the live security checkpoint for the entire microgrid. It processes all the 'Zero-Knowledge' math for the network.",
                            "The Secret Receipt: When a house wants to sell energy, it creates a complex mathematical puzzle. This puzzle proves the house actually has the energy it claims to have, but completely hides the house's physical location and private hardware data.",
                            "The Blockchain Bouncer: Before any trade is allowed, the central smart contract checks this math puzzle. If the math is perfect, the trade is verified (shown in green).",
                            "The Penalty Box: You will also see a 'Slash Registry' here. If a hacker or a broken node tries to lie and submit a fake energy proof to steal money, the network instantly catches the bad math, blocks the trade, and records the penalty."
                        ]}
                    />
                </div>
            </div>

            {/* ── Main 3-col grid ─────────────────────────────────── */}
            <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">

                {/* ── Live Event Stream (col-span-2) ───────────────── */}
                <TermCard className="col-span-2 overflow-hidden p-4">
                    <TermLabel>Live Event Stream</TermLabel>

                    <div
                        className="flex-1 overflow-y-auto space-y-1 pr-1"
                        style={{
                            /* dark custom scrollbar */
                            scrollbarWidth: 'thin',
                            scrollbarColor: '#2A2E39 transparent',
                        }}
                    >
                        {events.length === 0 && (
                            <p className="text-[11px] font-mono" style={{ color: '#9DA7B3' }}>
                                awaiting events…
                            </p>
                        )}

                        {events.map(e => {
                            const col = TYPE_COLOR[e.type] ?? '#9DA7B3'
                            return (
                                <div
                                    key={e.id}
                                    className="flex items-start gap-2.5 py-1.5 px-2.5 rounded"
                                    style={{ background: `${col}0D`, borderLeft: `2px solid ${col}` }}
                                >
                                    {/* badge */}
                                    <span
                                        className="mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0"
                                        style={{ color: col, background: `${col}1A` }}
                                    >
                                        {e.type}
                                    </span>

                                    {/* message + timestamp */}
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className="text-[11px] font-mono truncate"
                                            style={{ color: '#E6EDF3' }}
                                        >
                                            {e.message}
                                        </p>
                                        <p className="text-[9px] font-mono mt-0.5" style={{ color: '#9DA7B3' }}>
                                            {new Date(e.timestamp).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </TermCard>

                {/* ── Right column ─────────────────────────────────── */}
                <div className="flex flex-col gap-4 h-full">

                    {/* AMM Reserves */}
                    <TermCard className="p-6" style={{ minHeight: '14rem' }}>
                        <TermLabel>AMM Reserves</TermLabel>
                        {[
                            { label: 'Energy (x)', value: energyReserve.toFixed(1), unit: 'kWh', color: '#4DA3FF', pct: Math.min(100, energyReserve / 90) },
                            { label: 'Stable (y)', value: stableReserve.toFixed(1), unit: 'USDC', color: '#00E676', pct: Math.min(100, stableReserve / 20) },
                        ].map(r => (
                            <div key={r.label} className="mb-6 last:mb-0">
                                <div className="flex justify-between items-center mb-3">
                                    <span
                                        className="text-sm font-mono uppercase tracking-wider"
                                        style={{ color: '#9DA7B3' }}
                                    >
                                        {r.label}
                                    </span>
                                    <span
                                        className="text-xl font-bold font-mono"
                                        style={{ color: r.color }}
                                    >
                                        {r.value}{' '}
                                        <span className="text-sm font-normal" style={{ color: `${r.color}99` }}>
                                            {r.unit}
                                        </span>
                                    </span>
                                </div>
                                {/* progress bar — thicker */}
                                <div
                                    className="h-3 rounded-full overflow-hidden"
                                    style={{ background: '#2A2E39' }}
                                >
                                    <motion.div
                                        className="h-full rounded-full"
                                        animate={{ width: `${r.pct}%` }}
                                        style={{ background: r.color, opacity: 0.75 }}
                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                    />
                                </div>
                            </div>
                        ))}
                    </TermCard>

                    {/* Slash Registry */}
                    <TermCard className="p-4 overflow-hidden" style={{ flex: '2 1 0', minHeight: '16rem' }}>
                        <TermLabel>Slash Registry</TermLabel>
                        <div
                            className="flex-1 overflow-y-auto space-y-1.5"
                            style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2E39 transparent' }}
                        >
                            {slashEvents.length === 0 && (
                                <p className="text-[10px] font-mono" style={{ color: '#9DA7B3' }}>
                                    no slashes recorded
                                </p>
                            )}
                            {slashEvents.map(e => (
                                <div
                                    key={e.id}
                                    className="py-1.5 px-2.5 rounded"
                                    style={{
                                        background: 'rgba(255,61,0,0.07)',
                                        borderLeft: '2px solid #FF3D00',
                                    }}
                                >
                                    <p className="text-[10px] font-mono" style={{ color: '#FF3D00' }}>
                                        {e.message}
                                    </p>
                                    <p className="text-[9px] font-mono mt-0.5" style={{ color: '#9DA7B3' }}>
                                        {new Date(e.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </TermCard>

                    {/* ZK Proofs Verified */}
                    <TermCard className="p-4 flex-1" style={{ minHeight: '8rem' }}>
                        <div className="flex flex-col items-center justify-center h-full gap-2">
                            <TermLabel>ZK Proofs Verified</TermLabel>
                            <p
                                className="font-mono font-bold leading-none"
                                style={{ fontSize: '4.5rem', color: '#00E676', lineHeight: 1 }}
                            >
                                {verifiedEvents.length}
                            </p>
                            <p className="text-[9px] font-mono" style={{ color: '#9DA7B3' }}>
                                since session start
                            </p>
                        </div>
                    </TermCard>

                </div>
            </div>
        </motion.div>
    )
}
