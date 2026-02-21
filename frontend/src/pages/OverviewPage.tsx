import { Suspense, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useGridStore } from '../store/useGridStore'
import MicrogridCanvas from '../components/three/MicrogridCanvas'

// Telemetry Panel Component
function TelemetryPanel() {
  const { gridLoad, generation, price, swapFee, batterySoc, gridImbalance, reward, energyReserve, stableReserve } = useGridStore()
  const imbalanceColor = Math.abs(gridImbalance) > 20 ? 'text-rose-400' : gridImbalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
  const imbalanceValue = `${gridImbalance >= 0 ? '+' : ''}${gridImbalance.toFixed(2)}`

  return (
    <div className="h-full bg-slate-950/70 backdrop-blur-md px-4 py-5">
      <div className="space-y-3">
        <MetricRow label="Grid Load" value={`${gridLoad.toFixed(1)}`} unit="kW" tone="load" />
        <MetricRow label="Generation" value={`${generation.toFixed(1)}`} unit="kW" tone="gen" />
        <MetricRow label="Price" value={price.toFixed(4)} unit="USDC" />
        <MetricRow label="Swap Fee" value={swapFee.toFixed(2)} unit="%" />
        <MetricRow label="Battery" value={batterySoc.toFixed(1)} unit="%" />
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/30">
        <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wider mb-2">AI Controller</p>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-slate-500">Imbalance</span>
          <span className={`text-[13px] font-semibold ${imbalanceColor}`}>
            {imbalanceValue} <span className="text-[10px] text-slate-500">kW</span>
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Reward</span>
          <span className="text-[13px] font-semibold text-indigo-300">{reward.toFixed(3)}</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/30">
        <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wider mb-2">Reserves</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Energy</span>
            <span className="text-[13px] font-semibold text-slate-200">{energyReserve.toFixed(1)} <span className="text-[10px] text-slate-500">kWh</span></span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Stable</span>
            <span className="text-[13px] font-semibold text-slate-200">{stableReserve.toFixed(1)} <span className="text-[10px] text-slate-500">USDC</span></span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricRow({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: 'load' | 'gen' }) {
  let color = 'text-slate-200'
  if (tone === 'gen') color = 'text-emerald-400'
  if (tone === 'load') color = 'text-rose-400'

  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className={`text-[13px] font-semibold ${color}`}>
        {value}
        {unit && <span className="ml-1 text-[10px] text-slate-500">{unit}</span>}
      </span>
    </div>
  )
}

export default function OverviewPage() {
  const { nodes } = useGridStore()
  const [showContent, setShowContent] = useState(false)
  const activeNodes = nodes?.length || 15

  // Trigger content animation after mount
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <motion.div 
        className="mb-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : -20 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <p className="text-base font-semibold text-slate-200">Microgrid Network</p>
        <p className="text-[11px] text-slate-500">{activeNodes} nodes • P2P trading • ERC-1155</p>
      </motion.div>

      {/* Main Canvas Container with Telemetry Inside */}
      <div className="flex-1 min-h-0 rounded-3xl bg-slate-950/40 overflow-hidden relative">
        <div className="h-full" style={{ contain: 'strict', willChange: 'transform' }}>
          <Suspense fallback={
            <div className="flex h-full items-center justify-center text-slate-500 text-sm">Loading…</div>
          }>
            <motion.div
              className="h-full"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: showContent ? 1 : 0, scale: showContent ? 1 : 0.98 }}
              transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
            >
              <MicrogridCanvas />
            </motion.div>
          </Suspense>
        </div>

        {/* Telemetry Panel - slides in from right WITHIN the canvas container */}
        <motion.div
          className="absolute top-0 right-0 h-full w-64"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: showContent ? 0 : '100%', opacity: showContent ? 1 : 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.23, 1, 0.32, 1] }}
        >
          <TelemetryPanel />
        </motion.div>
      </div>
    </motion.div>
  )
}
