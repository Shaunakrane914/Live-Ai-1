import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGridStore } from '../store/useGridStore'
import PageInfo from '../components/ui/PageInfo'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
}

// 3D Floating Card Component
function HolographicCard({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: 15 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.23, 1, 0.32, 1] }}
      className={`relative group ${className}`}
      style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
    >
      {/* Animated border glow */}
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
      
      {/* Card content */}
      <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden" style={{ transformStyle: 'preserve-3d' }}>
        {/* Holographic sheen */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-blue-500/30 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-emerald-500/30 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-purple-500/30 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-blue-500/30 rounded-br-xl" />
        
        {children}
      </div>
    </motion.div>
  )
}

// 3D Node Avatar
function Node3DAvatar({ nodeId, nodeGen, nodeLoad, batSoc }: { nodeId: number; nodeGen: number; nodeLoad: number; batSoc: number }) {
  const surplus = nodeGen - nodeLoad
  const isPositive = surplus > 0
  
  return (
    <div className="relative w-48 h-48 mx-auto" style={{ perspective: '1000px' }}>
      {/* Outer ring */}
      <motion.div
        animate={{ rotateY: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 rounded-full border-2 border-dashed border-slate-600/30"
        style={{ transformStyle: 'preserve-3d' }}
      />
      
      {/* Middle ring */}
      <motion.div
        animate={{ rotateX: 360 }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-4 rounded-full border border-slate-500/20"
        style={{ transformStyle: 'preserve-3d' }}
      />
      
      {/* Inner energy core */}
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          boxShadow: isPositive 
            ? ['0 0 20px rgba(245, 158, 11, 0.3)', '0 0 40px rgba(245, 158, 11, 0.5)', '0 0 20px rgba(245, 158, 11, 0.3)']
            : ['0 0 20px rgba(37, 99, 235, 0.3)', '0 0 40px rgba(37, 99, 235, 0.5)', '0 0 20px rgba(37, 99, 235, 0.3)']
        }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute inset-8 rounded-full flex items-center justify-center"
        style={{ 
          background: isPositive 
            ? 'radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, rgba(245, 158, 11, 0.1) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(37, 99, 235, 0.3) 0%, rgba(37, 99, 235, 0.1) 50%, transparent 70%)',
          transformStyle: 'preserve-3d',
          transform: 'translateZ(20px)'
        }}
      >
        <span className="text-5xl font-bold text-slate-100" style={{ transform: 'translateZ(10px)' }}>#{nodeId}</span>
      </motion.div>
      
      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: isPositive ? '#F59E0B' : '#2563EB',
            boxShadow: `0 0 10px ${isPositive ? '#F59E0B' : '#2563EB'}`,
            left: '50%',
            top: '50%',
          }}
          animate={{
            x: [0, Math.cos(i * 60 * Math.PI / 180) * 80, 0],
            y: [0, Math.sin(i * 60 * Math.PI / 180) * 80, 0],
            z: [0, 30, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 4,
            delay: i * 0.6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
      
      {/* Battery indicator arc */}
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="#1e293b"
          strokeWidth="2"
        />
        <motion.circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="#00A152"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${batSoc * 2.64} 264`}
          style={{ filter: 'drop-shadow(0 0 4px #00A152)' }}
        />
      </svg>
    </div>
  )
}

// 3D Gauge
function Gauge3D({ value, max, label, unit, color, icon, delay = 0 }: { 
  value: number; max: number; label: string; unit: string; color: string; icon: string; delay?: number 
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotateY: -30 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] }}
      className="relative flex flex-col items-center"
      style={{ perspective: '500px' }}
    >
      <div className="relative w-24 h-24" style={{ transformStyle: 'preserve-3d' }}>
        <div className="absolute inset-0 rounded-xl bg-slate-800/50" style={{ transform: 'translateZ(-10px)' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <defs>
              <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={color} stopOpacity="1" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="8" />
            <motion.circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke={`url(#grad-${label})`}
              strokeWidth="8"
              strokeLinecap="round"
              initial={{ strokeDasharray: '0 251' }}
              animate={{ strokeDasharray: `${(percentage / 100) * 251} 251` }}
              transition={{ duration: 1.5, delay: delay + 0.3, ease: 'easeOut' }}
              style={{ filter: `drop-shadow(0 0 8px ${color})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transform: 'translateZ(10px)' }}>
            <span className="text-xl">{icon}</span>
            <span className="text-lg font-bold text-slate-100">{value.toFixed(1)}</span>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-2">{label}</p>
      <p className="text-[10px] text-slate-400">{unit}</p>
    </motion.div>
  )
}

// Energy Flow
function EnergyFlow({ nodeGen, nodeLoad }: { nodeGen: number; nodeLoad: number }) {
  const surplus = nodeGen - nodeLoad
  const isSelling = surplus > 0
  
  return (
    <div className="relative h-12 w-full overflow-hidden rounded-xl bg-slate-950/50 mt-4">
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{
          background: isSelling 
            ? ['linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.1) 50%, transparent 100%)', 
               'linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.2) 50%, transparent 100%)',
               'linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.1) 50%, transparent 100%)']
            : ['linear-gradient(90deg, transparent 0%, rgba(37, 99, 235, 0.1) 50%, transparent 100%)', 
               'linear-gradient(90deg, transparent 0%, rgba(37, 99, 235, 0.2) 50%, transparent 100%)',
               'linear-gradient(90deg, transparent 0%, rgba(37, 99, 235, 0.1) 50%, transparent 100%)']
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full"
          style={{
            background: isSelling ? '#F59E0B' : '#2563EB',
            boxShadow: `0 0 6px ${isSelling ? '#F59E0B' : '#2563EB'}`,
            top: `${20 + (i * 15)}%`,
          }}
          animate={{
            left: isSelling ? ['10%', '90%'] : ['90%', '10%'],
            opacity: [0, 1, 0],
          }}
          transition={{ duration: 2, delay: i * 0.3, repeat: Infinity, ease: 'linear' }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-between px-4">
        <span className="text-[10px] text-slate-500">Gen: {nodeGen.toFixed(1)}kW</span>
        <motion.div animate={{ x: isSelling ? [0, 5, 0] : [0, -5, 0] }} transition={{ duration: 1, repeat: Infinity }}>
          <span className={`text-[10px] font-semibold ${isSelling ? 'text-amber-400' : 'text-blue-400'}`}>
            {Math.abs(surplus).toFixed(1)}kW {isSelling ? '→' : '←'}
          </span>
        </motion.div>
        <span className="text-[10px] text-slate-500">Load: {nodeLoad.toFixed(1)}kW</span>
      </div>
    </div>
  )
}
function AgentDecisionMatrix({ nodeGen, nodeLoad, batSoc, price, swapFee }: { 
    nodeGen: number; nodeLoad: number; batSoc: number; price: number; swapFee: number 
}) {
    // Determine agent state
    const surplus = nodeGen - nodeLoad
    const isSelling = surplus > 1.5 && batSoc > 30
    const isCharging = surplus > 0.5 && batSoc < 80
    const isBuying = surplus < -1 && batSoc > 20
    
    const stateConfig = isSelling ? {
        badge: '⚡ EXECUTING: SELLING TO AMM',
        color: '#F59E0B',
        bg: 'rgba(245, 158, 11, 0.15)',
        action: `Selling ${surplus.toFixed(1)}kW surplus at ${price.toFixed(4)} USDC/kWh`
    } : isCharging ? {
        badge: '🔋 CHARGING BATTERY',
        color: '#00A152',
        bg: 'rgba(0, 161, 82, 0.15)',
        action: `Storing ${surplus.toFixed(1)}kW excess (Battery at ${batSoc.toFixed(1)}%)`
    } : isBuying ? {
        badge: '⚡ ACQUIRING ENERGY',
        color: '#2563EB',
        bg: 'rgba(37, 99, 235, 0.15)',
        action: `Purchasing ${Math.abs(surplus).toFixed(1)}kW deficit at ${price.toFixed(4)} USDC/kWh`
    } : {
        badge: '💤 IDLE: OPTIMAL STATE',
        color: '#64748B',
        bg: 'rgba(100, 116, 139, 0.15)',
        action: 'Grid balanced. No action required.'
    }

    const decisionLog = [
        `> Solar yield (${nodeGen.toFixed(1)}kW) ${surplus > 0 ? 'exceeds' : 'below'} consumption (${nodeLoad.toFixed(1)}kW).`,
        `> Battery SoC at ${batSoc.toFixed(1)}% ${batSoc > 80 ? '(Above 80% threshold)' : batSoc < 30 ? '(Below 30% threshold)' : '(Within optimal range)'}).`,
        `> Market Price ${price.toFixed(4)} USDC ${price > 0.09 ? '(High)' : price < 0.07 ? '(Low)' : '(Neutral)'} — Swap Fee ${swapFee.toFixed(2)}%.`,
        `> ACTION: ${stateConfig.action}`,
    ]

    return (
        <div className="h-full flex flex-col">
            {/* Status Badge */}
            <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] text-slate-400 uppercase tracking-wider">Auto-Aegis Agent</p>
                <motion.div 
                    className="px-3 py-1.5 rounded-full text-[10px] font-semibold"
                    style={{ background: stateConfig.bg, color: stateConfig.color }}
                    animate={{ opacity: [1, 0.7, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    {stateConfig.badge}
                </motion.div>
            </div>

            {/* Decision Log */}
            <div className="flex-1 bg-slate-950/50 rounded-xl p-3 overflow-hidden">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Decision Matrix</p>
                <div className="space-y-1.5">
                    {decisionLog.map((line, i) => (
                        <motion.p 
                            key={i} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="text-[10px] font-mono leading-relaxed"
                            style={{ 
                                color: line.startsWith('> ACTION') ? stateConfig.color : 
                                       line.includes('exceeds') || line.includes('Above') ? '#00A152' :
                                       line.includes('below') || line.includes('Below') ? '#EF4444' : '#64748B'
                            }}
                        >
                            {line}
                        </motion.p>
                    ))}
                </div>
            </div>
        </div>
    )
}

// Mini Sparkline Chart
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * 100
        const y = 100 - ((v - min) / range) * 80 - 10
        return `${x},${y}`
    }).join(' ')

    return (
        <svg className="w-full h-10" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
                <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon 
                points={`0,100 ${points} 100,100`} 
                fill={`url(#gradient-${color})`}
            />
            <polyline 
                points={points} 
                fill="none" 
                stroke={color} 
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 0 4px ${color})` }}
            />
        </svg>
    )
}

export default function NodePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const nodeId = Math.max(0, Math.min(14, parseInt(id ?? '0')))

  const { generation, gridLoad, swapFee, energyReserve, stableReserve, nodes: storeNodes, price } = useGridStore()

  const liveNode = storeNodes?.[nodeId]
  const nodeGen = liveNode ? liveNode.current_gen : generation * (0.06 + Math.sin(nodeId * 1.7) * 0.04)
  const nodeLoad = liveNode ? liveNode.current_load : gridLoad * (0.06 + Math.cos(nodeId * 2.1) * 0.03)
  const batSoc = liveNode ? liveNode.battery_soc : 30 + (Math.sin(nodeId * 1.1) * 0.5 + 0.5) * 65

  const usdcBal = (energyReserve / 100 * (0.5 + nodeId * 0.1)).toFixed(2)
  const lpTokens = (stableReserve / 10 * (0.5 + nodeId * 0.08)).toFixed(2)
  const collat = (parseFloat(usdcBal) * 1.5).toFixed(2)
  const pnl = ((nodeGen - nodeLoad) * swapFee * 0.1)

  const pnlHistory = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => {
      const t = i / 19
      return pnl * (0.7 + t * 0.6 + Math.sin(t * Math.PI) * 0.3)
    })
  }, [pnl, nodeId])

  const zkId = `0x${Math.random().toString(16).slice(2, 6).toUpperCase()}...${Math.random().toString(16).slice(2, 5).toUpperCase()}`

  return (
    <motion.div {...fadeUp} className="h-full flex flex-col gap-4" style={{ perspective: '1200px' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <button
              onClick={() => navigate('/overview')}
              className="text-[10px] text-blue-400 mb-1 hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              ← Grid Overview
            </button>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Prosumer Node #{nodeId}</h1>
            <p className="text-[11px] text-slate-500 uppercase tracking-wider">
              On-chain prosumer · ZK-verified · DDPG Agent
              {liveNode && <span className="ml-2 text-emerald-400">● LIVE</span>}
            </p>
          </div>
          <PageInfo 
            title="Prosumer Terminal"
            description={[
              "This is the individual telemetry for a single autonomous household in the microgrid.",
              "The Auto-Aegis Agent continuously evaluates local battery levels and market prices to trade autonomously.",
              "Zero-Knowledge proofs ensure the node's physical load data is never exposed on the public blockchain."
            ]}
          />
        </div>
        
        <div className="flex flex-wrap gap-1 max-w-[200px] justify-end">
          {Array.from({ length: 15 }, (_, n) => (
            <motion.button 
              key={n} 
              whileTap={{ scale: 0.92 }}
              onClick={() => navigate(`/node/${n}`)}
              className="w-7 h-7 rounded-lg text-[10px] font-bold transition-all"
              style={{
                background: n === nodeId ? '#3b82f6' : 'rgba(59, 130, 246, 0.15)',
                color: n === nodeId ? '#fff' : '#60a5fa',
                border: n === nodeId ? 'none' : '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              {n}
            </motion.button>
          ))}
        </div>
      </div>

      {/* 3D Avatar + Gauges Row */}
      <div className="grid grid-cols-[300px_1fr] gap-4 h-[240px]">
        <HolographicCard delay={0.1} className="h-full">
          <div className="p-4 h-full flex flex-col">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 text-center">Node Identity</p>
            <div className="flex-1 flex items-center justify-center">
              <Node3DAvatar nodeId={nodeId} nodeGen={nodeGen} nodeLoad={nodeLoad} batSoc={batSoc} />
            </div>
            <EnergyFlow nodeGen={nodeGen} nodeLoad={nodeLoad} />
          </div>
        </HolographicCard>

        <HolographicCard delay={0.2} className="h-full">
          <div className="p-4 h-full flex flex-col">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Telemetry</p>
            <div className="flex-1 flex justify-around items-center">
              <Gauge3D value={nodeGen} max={30} label="Solar" unit="kW" color="#F59E0B" icon="☀" delay={0.3} />
              <Gauge3D value={nodeLoad} max={30} label="Load" unit="kW" color="#2563EB" icon="⚡" delay={0.4} />
              <Gauge3D value={batSoc} max={100} label="Battery" unit="%" color="#00A152" icon="🔋" delay={0.5} />
            </div>
          </div>
        </HolographicCard>
      </div>

      {/* Bottom Row */}
      <div className="flex-1 grid grid-cols-[1fr_300px] gap-4 min-h-0">
        <HolographicCard delay={0.3} className="h-full">
          <div className="p-4 h-full flex flex-col">
            <AgentDecisionMatrix 
              nodeGen={nodeGen} 
              nodeLoad={nodeLoad} 
              batSoc={batSoc} 
              price={price || 0.084} 
              swapFee={swapFee}
            />
          </div>
        </HolographicCard>

        <div className="flex flex-col gap-4 h-full">
          <HolographicCard delay={0.4} className="flex-1">
            <div className="p-4 h-full flex flex-col">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">DeFi Portfolio</p>
              
              <div className="mb-3">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[10px] text-slate-400">Net P&L</span>
                  <span className={`text-base font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {pnl >= 0 ? '+' : ''}{pnl.toFixed(3)} USDC
                  </span>
                </div>
                <MiniSparkline data={pnlHistory} color={pnl >= 0 ? '#00A152' : '#EF4444'} />
              </div>

              <div className="space-y-2 flex-1">
                {[
                  { label: 'USDC', value: `$${usdcBal}`, color: '#f8fafc' },
                  { label: 'LP Tokens', value: lpTokens, color: '#60a5fa' },
                  { label: 'Collateral', value: `$${collat}`, color: '#fbbf24' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-1.5 px-2 rounded bg-slate-800/50">
                    <span className="text-[10px] text-slate-400">{item.label}</span>
                    <span className="text-[11px] font-semibold" style={{ color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <div className="flex justify-between mb-1">
                  <span className="text-[9px] text-slate-500">Stake Health</span>
                  <span className="text-[9px] text-slate-400">{Math.min(100, batSoc * 0.8).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <motion.div 
                    className="h-full rounded-full"
                    animate={{ width: `${Math.min(100, batSoc * 0.8)}%` }}
                    style={{ background: 'linear-gradient(90deg, #3b82f6, #00A152)' }}
                  />
                </div>
              </div>
            </div>
          </HolographicCard>

          <HolographicCard delay={0.5}>
            <div className="p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">ZK Identity</p>
              
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] text-slate-500 font-mono">zkID:</span>
                <span className="text-[10px] text-slate-300 font-mono">{zkId}</span>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <motion.div 
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-[9px] font-semibold text-emerald-400 tracking-wider">GROTH16 PROVER: ACTIVE</span>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-700/30 flex justify-between text-[9px]">
                <span className="text-slate-500">Privacy</span>
                <span className="text-emerald-400">ZK-SNARK</span>
              </div>
            </div>
          </HolographicCard>
        </div>
      </div>
    </motion.div>
  )
}
