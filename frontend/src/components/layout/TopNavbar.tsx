import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGridStore } from '../../store/useGridStore'
import { useSocketEmit } from '../../providers/SocketContext'

const ROUTES = [
    { to: '/overview', label: 'Overview' },
    { to: '/amm', label: 'AMM Floor' },
    { to: '/node/1', label: 'Prosumer' },
    { to: '/zk-terminal', label: 'ZK Terminal' },
]

const CHAOS_BTNS = [
    { label: 'Cloud Cover', desc: 'Solar −40%', event: 'chaos:cloud_cover' },
    { label: 'Peak Demand', desc: 'Load +60%', event: 'chaos:peak_demand' },
    { label: 'Bad Actor', desc: 'Fraud inject', event: 'chaos:malicious_actor' },
    { label: 'Trade Fail', desc: 'Slash trigger', event: 'chaos:delivery_fail' },
]

export default function TopNavbar() {
    const { connected } = useGridStore()
    const emit = useSocketEmit()
    const [open, setOpen] = useState(false)

    const toggleChaos = () => setOpen(v => !v)

    return (
        <header className="h-14 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur z-20">
            <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                    Æ
                </div>
                <div className="leading-tight">
                    <p className="text-[13px] font-semibold text-slate-100 tracking-tight">
                        AegisGrid
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">
                        Protocol v1
                    </p>
                </div>
            </div>

            <nav className="flex items-center gap-6 text-xs font-medium">
                {ROUTES.map(route => (
                    <NavLink
                        key={route.to}
                        to={route.to}
                        className={({ isActive }) =>
                            [
                                'transition-colors',
                                'tracking-wide',
                                'uppercase',
                                'text-[11px]',
                                isActive ? 'text-slate-100' : 'text-slate-500 hover:text-slate-200',
                            ].join(' ')
                        }
                    >
                        {route.label}
                    </NavLink>
                ))}
            </nav>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-[11px]">
                    <span
                        className={[
                            'w-2 h-2 rounded-full',
                            connected ? 'bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]' : 'bg-amber-400 shadow-[0_0_0_4px_rgba(245,158,11,0.25)]',
                        ].join(' ')}
                    />
                    <span className={connected ? 'text-emerald-300' : 'text-amber-300'}>
                        {connected ? 'Live WebSocket' : 'Mock Mode'}
                    </span>
                </div>

                <div className="relative">
                    <button
                        type="button"
                        onClick={toggleChaos}
                        className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:border-slate-500 hover:bg-slate-900 focus:outline-none"
                    >
                        <span className="text-amber-300">⚡</span>
                        <span>Admin</span>
                    </button>

                    <AnimatePresence>
                        {open && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                                className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-800 bg-slate-950/95 backdrop-blur shadow-xl overflow-hidden z-30"
                            >
                                <div className="px-3 pt-3 pb-2 border-b border-slate-800">
                                    <p className="text-[11px] font-semibold tracking-wide text-slate-300 uppercase">
                                        Chaos Engine
                                    </p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        Demo-only stress scenarios
                                    </p>
                                </div>
                                <div className="py-1">
                                    {CHAOS_BTNS.map(btn => (
                                        <button
                                            key={btn.event}
                                            type="button"
                                            onClick={() => emit(btn.event)}
                                            className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-slate-900 flex flex-col"
                                        >
                                            <span className="text-slate-100 font-medium">
                                                {btn.label}
                                            </span>
                                            <span className="text-[10px] text-slate-500">
                                                {btn.desc}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    )
}
