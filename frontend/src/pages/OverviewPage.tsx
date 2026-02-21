import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { useGridStore } from '../store/useGridStore'
import MicrogridCanvas from '../components/three/MicrogridCanvas'

export default function OverviewPage() {
  const { nodes } = useGridStore()
  const activeNodes = nodes?.length || 15

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] as const }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="mb-3">
        <p className="text-base font-semibold text-slate-200">Microgrid Network</p>
        <p className="text-[11px] text-slate-500">
          {activeNodes} nodes • P2P trading • ERC-1155
        </p>
      </div>

      {/* Main Canvas with Stats Overlay */}
      <div className="flex-1 min-h-0 rounded-3xl bg-slate-950/40 overflow-hidden relative">
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
