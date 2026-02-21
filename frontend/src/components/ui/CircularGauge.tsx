import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

interface CircularGaugeProps {
    value: number
    max?: number
    label: string
    unit: string
    color: string
    size?: number
    icon?: string
}

export default function CircularGauge({
    value, max = 100, label, unit, color, size = 110, icon,
}: CircularGaugeProps) {
    const pct = Math.min(1, Math.max(0, value / max))
    const radius = (size - 16) / 2
    const circum = 2 * Math.PI * radius
    const strokeDash = circum * pct
    const strokeGap = circum - strokeDash

    const displayRef = useRef<HTMLSpanElement>(null)
    const motionVal = useMotionValue(0)
    const springVal = useSpring(motionVal, { damping: 22, stiffness: 130 })

    useEffect(() => { motionVal.set(value) }, [value, motionVal])
    useEffect(() => {
        const unsub = springVal.on('change', v => {
            if (displayRef.current) displayRef.current.textContent = v.toFixed(1)
        })
        return unsub
    }, [springVal])

    const glowId = `glow-${label.replace(/\s/g, '-')}`

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="rotate-[-90deg]">
                    <defs>
                        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2.5" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    </defs>

                    {/* Track — subtle on light bg */}
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                        stroke="rgba(0,0,0,0.08)" strokeWidth="8" />

                    {/* Value arc */}
                    <motion.circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
                        filter={`url(#${glowId})`}
                        initial={{ strokeDasharray: `0 ${circum}` }}
                        animate={{ strokeDasharray: `${strokeDash} ${strokeGap}` }}
                        transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
                    />

                    {/* Ticks */}
                    {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                        const angle = t * 2 * Math.PI - Math.PI / 2
                        return (
                            <line key={i}
                                x1={size / 2 + Math.cos(angle) * (radius - 10)} y1={size / 2 + Math.sin(angle) * (radius - 10)}
                                x2={size / 2 + Math.cos(angle) * (radius - 5)} y2={size / 2 + Math.sin(angle) * (radius - 5)}
                                stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />
                        )
                    })}
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {icon && <span className="text-base mb-0.5">{icon}</span>}
                    <div className="flex items-baseline gap-0.5">
                        <span ref={displayRef} className="metric-value font-bold"
                            style={{ color, fontSize: size * 0.18 }}>
                            {value.toFixed(1)}
                        </span>
                        <span className="text-[9px] text-[#8B93A4]">{unit}</span>
                    </div>
                </div>
            </div>

            <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-[#8B93A4] font-semibold">{label}</p>
                <div className="mt-1 h-0.5 rounded-full mx-auto w-8" style={{ background: `${color}50` }} />
            </div>
        </div>
    )
}
