import { NavLink } from 'react-router-dom'

const ROUTES = [
    { to: '/overview', icon: '⬡', label: 'Macro Grid', sub: 'Overview' },
    { to: '/amm', icon: '◎', label: 'AMM Floor', sub: 'Trading' },
    { to: '/node/1', icon: '◈', label: 'Prosumer', sub: 'Node View' },
    { to: '/zk-terminal', icon: '⬢', label: 'ZK Terminal', sub: 'Cryptographic' },
]

export default function Sidebar() {
    return (
        <aside
            className="flex flex-col bg-white border-r border-[#E5E7EB] z-30 overflow-hidden flex-shrink-0"
            style={{ width: 212 }}
        >
            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                <p className="section-label pl-3 mb-3">Menu</p>
                {ROUTES.map(r => (
                    <NavLink
                        key={r.to}
                        to={r.to}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        {({ isActive }) => (
                            <>
                                <span
                                    className="text-[16px] leading-none flex-shrink-0 transition-colors duration-150"
                                    style={{ color: isActive ? '#3B82F6' : '#9CA3AF' }}
                                >
                                    {r.icon}
                                </span>
                                <div className="min-w-0">
                                    <p className="text-[13px] font-semibold leading-tight">{r.label}</p>
                                    <p className="text-[10px] leading-tight text-[#9CA3AF]">{r.sub}</p>
                                </div>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>
        </aside>
    )
}
