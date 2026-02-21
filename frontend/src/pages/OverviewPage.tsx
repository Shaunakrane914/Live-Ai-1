import { Suspense, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGridStore } from '../store/useGridStore'
import MicrogridCanvas from '../components/three/MicrogridCanvas'

// Intro screen component
function IntroScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000) // 2 seconds for intro
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <motion.div
      className="absolute inset-0 z-50 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center"
      initial={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-6xl font-bold text-white tracking-tight">Cipher Grid</h1>
        <p className="text-blue-200 mt-4 text-lg tracking-widest uppercase">Autonomous Energy Network</p>
        <div className="mt-8 flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-white rounded-full"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function OverviewPage() {
  const [showIntro, setShowIntro] = useState(true)
  const [showCanvas, setShowCanvas] = useState(false)
  const [showTelemetry, setShowTelemetry] = useState(false)
  const { nodes } = useGridStore()
  const activeNodes = nodes?.length || 15

  // Animation sequence
  useEffect(() => {
    if (!showIntro) {
      // After intro slides away, show canvas
      const canvasTimer = setTimeout(() => setShowCanvas(true), 400)
      // Then show telemetry sliding from right
      const telemetryTimer = setTimeout(() => setShowTelemetry(true), 1200)
      return () => {
        clearTimeout(canvasTimer)
        clearTimeout(telemetryTimer)
      }
    }
  }, [showIntro])

  const handleIntroComplete = () => {
    setShowIntro(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] as const }}
      className="h-full flex flex-col relative overflow-hidden"
    >
      {/* Intro Screen */}
      <AnimatePresence>
        {showIntro && <IntroScreen onComplete={handleIntroComplete} />}
      </AnimatePresence>

      {/* Main Content - appears after intro */}
      <motion.div
        className="flex-1 flex flex-col min-h-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: showCanvas ? 1 : 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <motion.div 
          className="mb-3 px-4 pt-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: showCanvas ? 1 : 0, y: showCanvas ? 0 : -20 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <p className="text-base font-semibold text-slate-200">Microgrid Network</p>
          <p className="text-[11px] text-slate-500">
            {activeNodes} nodes • P2P trading • ERC-1155
          </p>
        </motion.div>

        {/* Main Canvas Area */}
        <div className="flex-1 min-h-0 mx-4 mb-4 rounded-3xl bg-slate-950/40 overflow-hidden relative">
          <div className="h-full" style={{ contain: 'strict', willChange: 'transform' }}>
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-slate-500 text-sm">
                  Loading…
                </div>
              }
            >
              <motion.div
                className="h-full"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ 
                  opacity: showCanvas ? 1 : 0, 
                  scale: showCanvas ? 1 : 0.95 
                }}
                transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
              >
                <MicrogridCanvas />
              </motion.div>
            </Suspense>
          </div>

          {/* Telemetry Panel - slides from right */}
          <motion.div
            className="absolute top-0 right-0 h-full w-72"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ 
              x: showTelemetry ? 0 : '100%', 
              opacity: showTelemetry ? 1 : 0 
            }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          >
            <TelemetryPanel />
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Telemetry Panel Component
function TelemetryPanel() {
  const { gridLoad, generation, price, swapFee, batterySoc, gridImbalance, reward, energyReserve, stableReserve } = useGridStore()

  const imbalanceColor = Math.abs(gridImbalance) > 20 ? 'text-rose-400' : gridImbalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
  const imbalanceValue = `${gridImbalance >= 0 ? '+' : ''}${gridImbalance.toFixed(2)}`

  return (
    <div className="h-full bg-slate-950/80 backdrop-blur-md px-4 py-5 border-l border-slate-800/50">
      {/* Protocol Metrics */}
      <div className="space-y-3">
        <MetricRow label="Grid Load" value={`${gridLoad.toFixed(1)}`} unit="kW" tone="load" />
        <MetricRow label="Generation" value={`${generation.toFixed(1)}`} unit="kW" tone="gen" />
        <MetricRow label="Price" value={price.toFixed(4)} unit="USDC" />
        <MetricRow label="Swap Fee" value={swapFee.toFixed(2)} unit="%" />
        <MetricRow label="Battery" value={batterySoc.toFixed(1)} unit="%" />
      </div>

      {/* AI Stats */}
      <div className="mt-4 pt-4 border-t border-slate-800/30">
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

      {/* Reserves */}
      <div className="mt-4 pt-4 border-t border-slate-800/30">
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
