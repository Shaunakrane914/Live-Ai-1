/**
 * MobileGuard.tsx
 * Shows a polished overlay on screens narrower than 768px.
 * Wrap around the main app in App.tsx.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function MobileGuard({ children }: { children: React.ReactNode }) {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)')
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
        setIsMobile(mq.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])

    return (
        <>
            <AnimatePresence>
                {isMobile && (
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Desktop required"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 px-8 text-center"
                        style={{
                            background: 'radial-gradient(ellipse at center, #0a0f1e 0%, #020408 100%)',
                        }}
                    >
                        {/* Animated grid lines */}
                        <div className="absolute inset-0 opacity-10"
                            style={{
                                backgroundImage: 'linear-gradient(rgba(99,102,241,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.4) 1px, transparent 1px)',
                                backgroundSize: '40px 40px',
                            }}
                        />

                        {/* Glowing icon */}
                        <motion.div
                            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.05, 1] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                            className="relative text-7xl"
                            aria-hidden="true"
                        >
                            🖥️
                            <motion.div
                                className="absolute inset-0 rounded-full"
                                animate={{ boxShadow: ['0 0 20px rgba(99,102,241,0.3)', '0 0 50px rgba(99,102,241,0.6)', '0 0 20px rgba(99,102,241,0.3)'] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                        </motion.div>

                        <div className="relative z-10 space-y-3">
                            <h1 className="text-2xl font-bold text-white tracking-tight">
                                Command Center
                            </h1>
                            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                                Gridium is a full-screen protocol terminal. Please rotate your device to landscape,
                                or switch to a desktop browser for the full command center experience.
                            </p>
                        </div>

                        {/* Rotate hint */}
                        <motion.div
                            animate={{ rotate: [0, 90, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' }}
                            aria-hidden="true"
                            className="text-4xl"
                        >
                            📱
                        </motion.div>

                        <p className="relative z-10 text-[11px] text-indigo-400 uppercase tracking-widest">
                            Gridium · Autonomous Energy Protocol
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Always render children so state is maintained */}
            <div className="h-full" aria-hidden={isMobile}>{children}</div>
        </>
    )
}
