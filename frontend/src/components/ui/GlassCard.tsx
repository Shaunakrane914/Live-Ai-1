import { type ReactNode, type CSSProperties } from 'react'
import { motion } from 'framer-motion'

interface GlassCardProps {
    children: ReactNode
    className?: string
    style?: CSSProperties
    delay?: number       // stagger delay in seconds
    strong?: boolean     // use glass-card-strong variant
    hover?: boolean      // enable hover lift (default true)
    onClick?: () => void
}

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 }

export default function GlassCard({
    children, className = '', style, delay = 0, strong = false, hover = true, onClick,
}: GlassCardProps) {
    const base = strong ? 'glass-card-strong' : 'glass-card'

    return (
        <motion.div
            className={`${base} ${className}`}
            style={style}
            onClick={onClick}
            // Float-in on mount with spring
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...spring, delay }}
            // Hover — lift + deepen glass
            {...(hover ? {
                whileHover: {
                    scale: 1.006,
                    boxShadow: '0 16px 48px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)',
                    transition: { duration: 0.2 },
                },
            } : {})}
        >
            {children}
        </motion.div>
    )
}
