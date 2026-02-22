/**
 * GlowButton.tsx
 * Drop-in replacement for <button> / <motion.button> with:
 *   - Soft neon glow on hover (Framer Motion whileHover)
 *   - Smooth scale + lift press effect
 *   - Full a11y: type, aria-label, focus-visible ring
 *
 * Usage:
 *   <GlowButton onClick={...} color="indigo" aria-label="Execute swap">
 *     Execute
 *   </GlowButton>
 *
 *   color: "indigo" | "amber" | "emerald" | "sky"
 */
import { motion } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

const PALETTES = {
    indigo: {
        glow: 'rgba(99,102,241,0.55)',
        border: 'rgba(99,102,241,0.4)',
        bg: 'linear-gradient(135deg, rgba(79,70,229,0.3) 0%, rgba(99,102,241,0.15) 100%)',
        text: '#a5b4fc',
        ring: '#6366f1',
    },
    amber: {
        glow: 'rgba(245,158,11,0.55)',
        border: 'rgba(245,158,11,0.4)',
        bg: 'linear-gradient(135deg, rgba(217,119,6,0.3) 0%, rgba(245,158,11,0.15) 100%)',
        text: '#fcd34d',
        ring: '#f59e0b',
    },
    emerald: {
        glow: 'rgba(16,185,129,0.55)',
        border: 'rgba(16,185,129,0.4)',
        bg: 'linear-gradient(135deg, rgba(5,150,105,0.3) 0%, rgba(16,185,129,0.15) 100%)',
        text: '#6ee7b7',
        ring: '#10b981',
    },
    sky: {
        glow: 'rgba(14,165,233,0.55)',
        border: 'rgba(14,165,233,0.4)',
        bg: 'linear-gradient(135deg, rgba(2,132,199,0.3) 0%, rgba(14,165,233,0.15) 100%)',
        text: '#7dd3fc',
        ring: '#0ea5e9',
    },
}

interface GlowButtonProps extends Omit<HTMLMotionProps<'button'>, 'color'> {
    children: ReactNode
    color?: keyof typeof PALETTES
    className?: string
}

export default function GlowButton({
    children,
    color = 'indigo',
    className = '',
    ...rest
}: GlowButtonProps) {
    const p = PALETTES[color]

    return (
        <motion.button
            type="button"
            whileHover={{
                scale: 1.04,
                y: -2,
                boxShadow: `0 0 18px ${p.glow}, 0 0 36px ${p.glow}55, 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)`,
            }}
            whileTap={{ scale: 0.97, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            className={`relative px-5 py-2.5 rounded-xl text-sm font-semibold tracking-wide cursor-pointer border
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
        transition-colors duration-150 ${className}`}
            style={{
                background: p.bg,
                borderColor: p.border,
                color: p.text,
                // @ts-ignore
                '--tw-ring-color': p.ring,
                boxShadow: `0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)`,
            }}
            {...rest}
        >
            {/* Top shine line */}
            <span className="absolute inset-x-3 top-0 h-px rounded-full bg-white/20 pointer-events-none" aria-hidden="true" />
            {children}
        </motion.button>
    )
}
