import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGridStore } from '../store/useGridStore'

const fadeUp = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
}

// Dark mode circular gauge
function DarkGauge({ value, max, label, unit, color, icon }: { 
    value: number; max: number; label: string; unit: string; color: string; icon: string 
}) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))
    const circumference = 2 * Math.PI * 45
    const strokeDashoffset = circumference - (percentage / 100) * circumference
    
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative w-28 h-28">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    {/* Background track */}
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8" />
                    {/* Progress arc */}
                    <circle 
                        cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        style={{ filter: `drop-shadow(0 0 6px ${color}50)` }}
                        className="transition-all duration-700"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl">{icon}</span>
                    <span className="text-lg font-bold text-slate-100">{value.toFixed(1)}</span>
                    <span className="text-[10px] text-slate-400">{unit}</span>
                </div>
            </div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider">{label}</p>
        </div>
    )
}

// Agent Decision Matrix Component
function AgentDecisionMatrix({ nodeGen, nodeLoad, batSoc, price, swapFee }: { 
    nodeGen: number; nodeLoad: number; batSoc: number; price: number; swapFee: number 
}) {
    // Determine agent state
    const surplus = nodeGen - nodeLoad
    const isSelling = surplus > 1.5 && batSoc > 30
    const isCharging = surplus > 0.5 && batSoc < 80
    const isBuying = surplus < -1 && batSoc > 20
    const isIdle = !isSelling && !isCharging && !isBuying
    
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

    // Real per-node data
    const liveNode = storeNodes?.[nodeId]
    const nodeGen = liveNode ? liveNode.current_gen : generation * (0.06 + Math.sin(nodeId * 1.7) * 0.04)
    const nodeLoad = liveNode ? liveNode.current_load : gridLoad * (0.06 + Math.cos(nodeId * 2.1) * 0.03)
    const batSoc = liveNode ? liveNode.battery_soc : 30 + (Math.sin(nodeId * 1.1) * 0.5 + 0.5) * 65

    // Wallet calculations
    const usdcBal = (energyReserve / 100 * (0.5 + nodeId * 0.1)).toFixed(2)
    const lpTokens = (stableReserve / 10 * (0.5 + nodeId * 0.08)).toFixed(2)
    const collat = (parseFloat(usdcBal) * 1.5).toFixed(2)
    const pnl = ((nodeGen - nodeLoad) * swapFee * 0.1)

    // Generate P&L history for sparkline
    const pnlHistory = useMemo(() => {
        return Array.from({ length: 20 }, (_, i) => {
            const t = i / 19
            return pnl * (0.7 + t * 0.6 + Math.sin(t * Math.PI) * 0.3)
        })
    }, [pnl, nodeId])

    // Mock ZK ID
    const zkId = `0x${Math.random().toString(16).slice(2, 6).toUpperCase()}...${Math.random().toString(16).slice(2, 5).toUpperCase()}`

    return (
        <motion.div {...fadeUp} className="h-full flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <button
                        onClick={() => navigate('/overview')}
                        className="text-[10px] text-blue-400 mb-1 hover:text-blue-300 flex items-center gap-1 transition-colors"
                    >
                        ← Grid Overview
                    </button>
                    <h1 className="text-xl font-bold text-slate-100 tracking-tight">Prosumer Node #{nodeId}</h1>
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider">
                        On-chain prosumer · ZK-verified trades · DDPG agent
                        {liveNode && <span className="ml-2 text-emerald-400">● LIVE</span>}
                    </p>
                </div>
                
                {/* Node switcher */}
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

            <div className="flex-1 grid grid-cols-[1fr_320px] gap-4 min-h-0">
                {/* Left Column */}
                <div className="flex flex-col gap-4">
                    {/* Gauges Panel */}
                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5">
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-4">Node Telemetry</p>
                        <div className="flex justify-around">
                            <DarkGauge value={nodeGen} max={30} label="Solar Yield" unit="kW" color="#F59E0B" icon="☀" />
                            <DarkGauge value={nodeLoad} max={30} label="Consumption" unit="kW" color="#3b82f6" icon="⚡" />
                            <DarkGauge value={batSoc} max={100} label="Battery SoC" unit="%" color="#00A152" icon="🔋" />
                        </div>
                    </div>

                    {/* Agent Decision Matrix */}
                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 flex-1">
                        <AgentDecisionMatrix 
                            nodeGen={nodeGen} 
                            nodeLoad={nodeLoad} 
                            batSoc={batSoc} 
                            price={price || 0.084} 
                            swapFee={swapFee}
                        />
                    </div>
                </div>

                {/* Right Column - Web3 Identity & Wallet */}
                <div className="flex flex-col gap-4">
                    {/* Wallet Panel */}
                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5">
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-4">DeFi Portfolio</p>
                        
                        {/* P&L Sparkline */}
                        <div className="mb-4">
                            <div className="flex items-baseline justify-between mb-2">
                                <span className="text-[11px] text-slate-400">Net P&L</span>
                                <span className={`text-lg font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {pnl >= 0 ? '+' : ''}{pnl.toFixed(3)} USDC
                                </span>
                            </div>
                            <MiniSparkline data={pnlHistory} color={pnl >= 0 ? '#00A152' : '#EF4444'} />
                        </div>

                        {/* Wallet Items */}
                        <div className="space-y-3">
                            {[
                                { label: 'USDC Balance', value: `$${usdcBal}`, color: '#f8fafc' },
                                { label: 'LP Tokens', value: lpTokens, color: '#60a5fa' },
                                { label: 'Collateral', value: `$${collat}`, color: '#fbbf24' },
                            ].map(item => (
                                <div key={item.label} className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-800/50">
                                    <span className="text-[11px] text-slate-400">{item.label}</span>
                                    <span className="text-[13px] font-semibold" style={{ color: item.color }}>
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Stake Health Bar */}
                        <div className="mt-4">
                            <div className="flex justify-between mb-1.5">
                                <span className="text-[10px] text-slate-500">Stake Health</span>
                                <span className="text-[10px] text-slate-400">{Math.min(100, batSoc * 0.8).toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <motion.div 
                                    className="h-full rounded-full"
                                    animate={{ width: `${Math.min(100, batSoc * 0.8)}%` }}
                                    style={{ background: 'linear-gradient(90deg, #3b82f6, #00A152)' }}
                                    transition={{ duration: 0.6 }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ZK Identity Card */}
                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5">
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-3">Cryptographic Identity</p>
                        
                        {/* ZK ID */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] text-slate-500 font-mono">zkID:</span>
                            <span className="text-[11px] text-slate-300 font-mono">{zkId}</span>
                        </div>

                        {/* GROTH16 Prover Badge */}
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <motion.div 
                                className="w-2 h-2 rounded-full bg-emerald-400"
                                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            />
                            <span className="text-[10px] font-semibold text-emerald-400 tracking-wider">
                                GROTH16 PROVER: ACTIVE
                            </span>
                        </div>

                        {/* Privacy Stats */}
                        <div className="mt-3 pt-3 border-t border-slate-700/30 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-[10px] text-slate-500">Privacy Level</span>
                                <span className="text-[10px] text-emerald-400 font-medium">ZK-SNARK</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[10px] text-slate-500">Circuit Depth</span>
                                <span className="text-[10px] text-slate-300 font-mono">2^17</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
