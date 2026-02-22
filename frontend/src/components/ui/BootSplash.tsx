/**
 * BootSplash.tsx
 * Web3-style loading screen shown while WebSocket + AI backend are booting.
 * - Waits 3.5s before appearing (lets IntroScreen finish first)
 * - Auto-dismisses when connected OR after a hard 6s max
 * - Never blocks the overview page
 */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGridStore } from '../../store/useGridStore'

const BOOT_STEPS = [
    { label: 'Initialising Gridium Protocol …', delay: 0 },
    { label: 'Connecting to AI Engine …', delay: 500 },
    { label: 'Handshaking Socket.io Gateway …', delay: 1000 },
    { label: 'Subscribing to live tick stream …', delay: 1500 },
    { label: 'Loading DDPG agent weights …', delay: 2000 },
]

function SkeletonRow({ width = 'w-full' }: { width?: string }) {
    return (
        <motion.div
            className={`h-3 rounded-full bg-slate-800 ${width}`}
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
    )
}

export default function BootSplash() {
    const connected = useGridStore(s => s.connected)
    // Start hidden — only show if backend hasn't connected after 3.5s
    const [visible, setVisible] = useState(false)
    const [stepIdx, setStepIdx] = useState(0)

    // Delay appearance so IntroScreen (2.5s) finishes first
    useEffect(() => {
        // Show only if not yet connected after 3.5s
        const showTimer = setTimeout(() => {
            if (!useGridStore.getState().connected) setVisible(true)
        }, 3500)
        // Hard dismiss after 6s no matter what
        const hardTimer = setTimeout(() => setVisible(false), 9500)
        return () => { clearTimeout(showTimer); clearTimeout(hardTimer) }
    }, [])

    // Dismiss immediately once connected
    useEffect(() => {
        if (connected) setVisible(false)
    }, [connected])

    // Advance boot steps only while visible
    useEffect(() => {
        if (!visible) return
        const timers = BOOT_STEPS.map((s, i) =>
            setTimeout(() => setStepIdx(i), s.delay)
        )
        return () => timers.forEach(clearTimeout)
    }, [visible])

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    role="status"
                    aria-live="polite"
                    aria-label="Gridium loading — connecting to backend"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="fixed inset-0 z-[150] flex flex-col items-center justify-center gap-8 bg-slate-950"
                    style={{
                        backgroundImage: 'radial-gradient(ellipse at 50% 40%, rgba(99,102,241,0.08) 0%, transparent 70%)',
                    }}
                >
                    {/* Animated grid */}
                    <div className="absolute inset-0 opacity-[0.04]"
                        style={{
                            backgroundImage: 'linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)',
                            backgroundSize: '48px 48px',
                        }}
                    />

                    {/* Logo pulse */}
                    <motion.div
                        animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="relative z-10 text-center"
                    >
                        <h1 className="text-5xl font-bold text-white tracking-tight">Gridium</h1>
                        <p className="text-indigo-400 text-xs tracking-[0.3em] uppercase mt-2">
                            Autonomous Energy Protocol
                        </p>
                    </motion.div>

                    {/* Spinning ring */}
                    <div className="relative z-10 w-16 h-16">
                        <motion.div
                            className="absolute inset-0 rounded-full border-2 border-indigo-500/20"
                        />
                        <motion.div
                            className="absolute inset-0 rounded-full border-t-2 border-indigo-400"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                        />
                        <motion.div
                            className="absolute inset-2 rounded-full border-t-2 border-purple-400/60"
                            animate={{ rotate: -360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        />
                    </div>

                    {/* Boot log */}
                    <div className="relative z-10 w-full max-w-sm space-y-2 px-6">
                        {BOOT_STEPS.map((step, i) => (
                            <motion.div
                                key={step.label}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: i <= stepIdx ? 1 : 0.2, x: 0 }}
                                transition={{ duration: 0.3 }}
                                className="flex items-center gap-3 text-[12px] font-mono"
                            >
                                <span className={i <= stepIdx ? 'text-emerald-400' : 'text-slate-600'}>
                                    {i < stepIdx ? '✓' : i === stepIdx ? '›' : '○'}
                                </span>
                                <span className={i <= stepIdx ? 'text-slate-300' : 'text-slate-600'}>
                                    {step.label}
                                </span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Skeleton preview of dashboard */}
                    <div className="relative z-10 w-full max-w-lg px-6 space-y-3" aria-hidden="true">
                        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
                            <SkeletonRow width="w-1/3" />
                            <SkeletonRow width="w-full" />
                            <SkeletonRow width="w-4/5" />
                            <div className="flex gap-3 pt-1">
                                <SkeletonRow width="w-1/2" />
                                <SkeletonRow width="w-1/3" />
                            </div>
                        </div>
                    </div>

                    {/* Status pill */}
                    <motion.div
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="relative z-10 flex items-center gap-2 text-[11px] text-slate-500"
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        {connected ? 'Backend connected — loading dashboard…' : 'Waiting for backend…'}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
