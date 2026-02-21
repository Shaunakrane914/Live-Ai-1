import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSocketEmit } from '../../providers/WebSocketProvider'

interface ChaosBtnConfig {
    label: string
    icon: string
    event: string
    color: string
    desc: string
}

const CHAOS_BUTTONS: ChaosBtnConfig[] = [
    { label: 'Cloud Cover', icon: '☁', event: 'chaos:cloud_cover', color: '#64748B', desc: 'Drops solar generation by 40%' },
    { label: 'Peak Demand', icon: '⚡', event: 'chaos:peak_demand', color: '#F59E0B', desc: 'Spikes grid load ~60%' },
    { label: 'Malicious Actor', icon: '👤', event: 'chaos:malicious_actor', color: '#EF4444', desc: 'Injects fraudulent behaviour' },
    { label: 'Delivery Failure', icon: '✕', event: 'chaos:delivery_fail', color: '#EF4444', desc: 'Triggers trade → slash' },
]

export default function ChaosPanel({ emit }: { emit?: (e: string, d?: unknown) => void }) {
    const socketEmit = useSocketEmit()
    const fn = emit ?? socketEmit
    const [firing, setFiring] = useState<string | null>(null)
    const [lastFired, setLastFired] = useState<string | null>(null)

    function fire(btn: ChaosBtnConfig) {
        if (firing) return
        setFiring(btn.event)
        fn(btn.event)
        setLastFired(btn.label)
        setTimeout(() => setFiring(null), 800)
    }

    return (
        <div>
            <p className="section-label">Chaos Control</p>
            <div className="grid grid-cols-2 gap-2">
                {CHAOS_BUTTONS.map(btn => (
                    <motion.button
                        key={btn.event}
                        onClick={() => fire(btn)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.96 }}
                        disabled={!!firing}
                        className="chaos-btn text-left"
                        style={{
                            color: btn.color,
                            background: firing === btn.event ? `${btn.color}22` : `${btn.color}0E`,
                            border: `1px solid ${btn.color}30`,
                            opacity: (firing && firing !== btn.event) ? 0.5 : 1,
                        }}
                    >
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[14px]">{btn.icon}</span>
                            <span className="font-bold text-[11px]">{btn.label}</span>
                        </div>
                        <p className="text-[9px] opacity-70 leading-tight">{btn.desc}</p>
                    </motion.button>
                ))}
            </div>
            {lastFired && (
                <p className="text-[9px] text-[#8B93A4] mt-2 font-mono">
                    ✓ Last: {lastFired}
                </p>
            )}
        </div>
    )
}
