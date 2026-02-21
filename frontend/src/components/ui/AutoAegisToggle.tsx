import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const STEPS = [
    'Sampling observation o_t from environment…',
    'Actor μ(o_t|θ) → action a_t computed',
    'Executing trade on AMM contract',
    'Generating ZK witness…',
    'R1CS constraint satisfaction: verified',
    'Broadcasting proof to settlement layer',
    'Reward r_t computed, critic Q updated',
]

export default function AutoAegisToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
    const [step, setStep] = useState(0)

    useEffect(() => {
        if (!active) { setStep(0); return }
        const id = setInterval(() => setStep(s => (s + 1) % STEPS.length), 1600)
        return () => clearInterval(id)
    }, [active])

    return (
        <div className="space-y-3">
            {/* Toggle row */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[13px] font-semibold text-[#1A1D23]">Auto-Aegis Agent</p>
                    <p className="text-[10px] text-[#8B93A4]">DDPG RL policy</p>
                </div>
                <button
                    onClick={onToggle}
                    className="relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none"
                    style={{ background: active ? 'linear-gradient(135deg,#4DA3FF,#2979FF)' : 'rgba(0,0,0,0.10)' }}
                >
                    <motion.div
                        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow"
                        animate={{ x: active ? 24 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                </button>
            </div>

            {/* Action log */}
            {active && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="rounded-xl p-2.5 font-mono text-[9px] space-y-1 overflow-hidden"
                    style={{ background: 'rgba(77,163,255,0.06)', border: '1px solid rgba(77,163,255,0.15)' }}
                >
                    {STEPS.slice(0, step + 1).map((s, i) => (
                        <p key={i} style={{ color: i === step ? '#2563EB' : '#94A3B8' }}>
                            {i === step ? '► ' : '✓ '}{s}
                        </p>
                    ))}
                </motion.div>
            )}
        </div>
    )
}
