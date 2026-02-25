import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGridStore } from '../../store/useGridStore'

/**
 * BackendWakeupBanner
 *
 * Shows a toast-style banner when:
 *   - waking=true  → "Backend is waking up…" (Render cold-start)
 *   - just connected (waking just flipped false + connected=true) → "🟢 Live Mode Active"
 */
export default function BackendWakeupBanner() {
    const connected = useGridStore((s) => s.connected)
    const waking = useGridStore((s) => s.waking)

    // Show a "Now Live!" flash for 3s after Render wakes up
    const [showLive, setShowLive] = useState(false)
    const prevWaking = usePrevious(waking)

    useEffect(() => {
        // Transition from waking → connected: show "Live!" briefly
        if (prevWaking && !waking && connected) {
            setShowLive(true)
            const t = setTimeout(() => setShowLive(false), 3500)
            return () => clearTimeout(t)
        }
    }, [waking, connected, prevWaking])

    const showWaking = waking && !connected
    const showBanner = showWaking || showLive

    return (
        <AnimatePresence>
            {showBanner && (
                <motion.div
                    key={showLive ? 'live' : 'waking'}
                    initial={{ opacity: 0, y: -60, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -60, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] pointer-events-none"
                >
                    {showLive ? (
                        /* ── Live flash ── */
                        <div className="flex items-center gap-3 px-5 py-3 rounded-xl
                                        bg-emerald-950/90 border border-emerald-500/50
                                        shadow-[0_0_30px_rgba(16,185,129,0.3)] backdrop-blur-md">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
                            </span>
                            <span className="text-emerald-300 font-semibold text-sm tracking-wide">
                                🟢 Live Mode Active — DDPG AI engine connected
                            </span>
                        </div>
                    ) : (
                        /* ── Waking banner ── */
                        <div className="flex items-center gap-3 px-5 py-3 rounded-xl
                                        bg-slate-900/90 border border-amber-500/40
                                        shadow-[0_0_30px_rgba(245,158,11,0.2)] backdrop-blur-md">
                            {/* Spinning loader */}
                            <svg className="animate-spin h-4 w-4 text-amber-400 shrink-0"
                                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10"
                                    stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <div>
                                <p className="text-amber-300 font-semibold text-sm tracking-wide">
                                    ⚡ Backend is waking up…
                                </p>
                                <p className="text-slate-400 text-xs mt-0.5">
                                    Running on Render free tier — takes ~20s. Mock simulation active in the meantime.
                                </p>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    )
}

// Utility: track previous value of a reactive variable
function usePrevious<T>(value: T): T | undefined {
    const [prev, setPrev] = useState<T | undefined>(undefined)
    useEffect(() => { setPrev(value) }, [value])
    return prev
}
