import { NavLink } from 'react-router-dom'
import { useGridStore } from '../../store/useGridStore'

const ROUTES = [
    { to: '/overview', icon: '⬡', label: 'Macro Grid', sub: 'Overview' },
    { to: '/amm', icon: '◎', label: 'AMM Floor', sub: 'Trading' },
    { to: '/node/1', icon: '◈', label: 'Prosumer', sub: 'Node View' },
    { to: '/zk-terminal', icon: '⬢', label: 'ZK Terminal', sub: 'Cryptographic' },
]

export default function Sidebar() {
    const { connected, events } = useGridStore()

    const latestEvt = events[0]
    const evtColor: Record<string, string> = {
        SWAP: '#4DA3FF', ZK_VERIFIED: '#00C853',
        SLASH: '#FF6B6B', CHAOS: '#FF9100', LIQUIDITY: '#9C6FFF',
    }

    return (
        /* Floating glass sidebar — rounded-3xl, soft shadow */
        <aside
            className="flex flex-col m-3 rounded-3xl glass-card-strong z-30 overflow-hidden"
            style={{ width: 200, minWidth: 200, flexShrink: 0 }}
        >
            {/* Brand */}
            <div className="px-5 pt-5 pb-4 border-b border-[rgba(0,0,0,0.06)]">
                <div className="flex items-center gap-2.5 mb-1">
                    <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                        style={{ background: 'linear-gradient(135deg, #4DA3FF, #2979FF)' }}
                    >
                        Æ
                    </div>
                    <div>
                        <p className="text-[13px] font-bold text-[#1A1D23] leading-tight">AegisGrid</p>
                        <p className="text-[9px] text-[#8B93A4] uppercase tracking-widest leading-tight">Protocol V1.0</p>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                <p className="section-label px-1 mb-3">Dashboard</p>
                {ROUTES.map(r => (
                    <NavLink
                        key={r.to}
                        to={r.to}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="text-[16px] leading-none">{r.icon}</span>
                        <div className="min-w-0">
                            <p className="text-[12px] font-semibold leading-tight">{r.label}</p>
                            <p className="text-[10px] text-[#8B93A4] leading-tight">{r.sub}</p>
                        </div>
                    </NavLink>
                ))}
            </nav>

            {/* Footer: connection + latest event */}
            <div className="px-4 py-4 border-t border-[rgba(0,0,0,0.06)] space-y-2">
                {/* Connection badge */}
                <div className="flex items-center gap-1.5">
                    <span className={`status-dot ${connected ? 'online' : 'mock'}`} />
                    <span className="text-[10px] font-semibold" style={{ color: connected ? '#00C853' : '#FF9100' }}>
                        {connected ? 'Live' : 'Mock simulation'}
                    </span>
                </div>

                {/* DDPG label */}
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse-slow" style={{ background: '#4DA3FF' }} />
                    <span className="text-[9px] text-[#8B93A4] metric-value">DDPG — ONLINE</span>
                </div>

                {/* Latest event pill */}
                {latestEvt && (
                    <div
                        className="mt-1 rounded-xl px-2.5 py-1.5 text-[9px] font-mono leading-tight truncate"
                        style={{
                            background: `${evtColor[latestEvt.type] ?? '#8B93A4'}15`,
                            color: evtColor[latestEvt.type] ?? '#8B93A4',
                            border: `1px solid ${evtColor[latestEvt.type] ?? '#8B93A4'}25`,
                        }}
                    >
                        <span className="font-bold">[{latestEvt.type}]</span> {latestEvt.message}
                    </div>
                )}

                {/* Wallet stub */}
                <div className="pt-1 border-t border-[rgba(0,0,0,0.06)]">
                    <p className="text-[9px] text-[#8B93A4]">Sepolia Testnet</p>
                    <p className="text-[9px] font-mono text-[#4B5263] truncate">0x1A2B…4E5F</p>
                </div>
            </div>
        </aside>
    )
}
