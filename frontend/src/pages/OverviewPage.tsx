import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { useGridStore } from '../store/useGridStore'
import MicrogridCanvas from '../components/three/MicrogridCanvas'

export default function OverviewPage() {
    const { connected } = useGridStore()

    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] as const }}
            className="h-full flex flex-col"
        >
            <div className="mb-3 flex items-baseline justify-end">
                <span
                    className={[
                        'px-2.5 py-1 rounded-full text-[10px] font-semibold border',
                        connected
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                            : 'border-amber-500/40 bg-amber-500/10 text-amber-300',
                    ].join(' ')}
                >
                    {connected ? 'Live' : 'Mock'}
                </span>
            </div>

            <div className="flex-1 min-h-0 rounded-3xl bg-slate-950/40 overflow-hidden">
                <div className="h-full" style={{ contain: 'strict', willChange: 'transform' }}>
                    <Suspense
                        fallback={
                            <div className="flex h-full items-center justify-center text-slate-500 text-sm">
                                Loading…
                            </div>
                        }
                    >
                        <MicrogridCanvas />
                    </Suspense>
                </div>
            </div>
        </motion.div>
    )
}
