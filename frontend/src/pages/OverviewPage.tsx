import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { useGridStore } from '../store/useGridStore'
import MicrogridCanvas from '../components/three/MicrogridCanvas'

function StatCard({ label, value, subtext, color = 'slate' }: { 
  label: string; 
  value: string; 
  subtext?: string;
  color?: 'slate' | 'emerald' | 'blue' | 'amber';
}) {
  const colorClasses = {
    slate: 'text-slate-300',
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
  }
  return (
    <div className="flex flex-col">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-semibold leading-tight ${colorClasses[color]}`}>{value}</p>
      {subtext && <p className="text-[10px] text-slate-600 mt-0.5">{subtext}</p>}
    </div>
  )
}

export default function OverviewPage() {
  const { connected, nodes, generation, gridLoad, price } = useGridStore()
  const activeNodes = nodes?.length || 15
  const healthyNodes = nodes?.filter(n => n.battery_soc > 20).length || activeNodes
  const healthPercent = Math.round((healthyNodes / activeNodes) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] as const }}
      className="h-full flex flex-col"
    >
      {/* Header with Stats */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-slate-200">Microgrid Network</p>
          <p className="text-[11px] text-slate-500">
            {activeNodes} autonomous nodes • P2P trading • ERC-1155
          </p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex gap-6">
            <StatCard 
              label="Nodes" 
              value={String(activeNodes)} 
              subtext={`${healthyNodes} healthy`}
              color="blue"
            />
            <StatCard 
              label="Health" 
              value={`${healthPercent}%`} 
              subtext={healthPercent > 90 ? 'Optimal' : 'Degraded'}
              color={healthPercent > 90 ? 'emerald' : 'amber'}
            />
            <StatCard 
              label="Price" 
              value={`${price.toFixed(3)}`}
              subtext="USDC/kWh"
              color="slate"
            />
            <StatCard 
              label="Flow" 
              value={`${(generation - gridLoad).toFixed(1)}`}
              subtext={generation > gridLoad ? 'kW Surplus' : 'kW Deficit'}
              color={generation > gridLoad ? 'emerald' : 'amber'}
            />
          </div>
          
          <span
            className={[
              'px-2.5 py-1 rounded-full text-[10px] font-semibold border ml-4',
              connected
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-300',
            ].join(' ')}
          >
            {connected ? 'Live' : 'Mock'}
          </span>
        </div>
      </div>

      {/* Main Canvas */}
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
