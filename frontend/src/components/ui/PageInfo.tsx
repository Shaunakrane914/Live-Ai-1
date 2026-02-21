import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

interface PageInfoProps {
  title: string
  description: string[]
  diagramSrc?: string
}

export default function PageInfo({ title, description, diagramSrc }: PageInfoProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const openPopover = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setIsOpen(true)
  }

  const closePopover = () => {
    hoverTimeoutRef.current = setTimeout(() => setIsOpen(false), 150)
  }

  // Position the portal popover directly below the button
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPos({
        top: rect.bottom + 10,
        left: rect.left,
      })
    }
  }, [isOpen])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="relative inline-block" style={{ perspective: '1000px' }}>
      {/* 3D Glowing Trigger Button */}
      <motion.button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={openPopover}
        onMouseLeave={closePopover}
        whileHover={{ scale: 1.1, rotateY: 10 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          y: [0, -2, 0],
          rotateZ: [0, 1, -1, 0]
        }}
        transition={{
          y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
          rotateZ: { duration: 6, repeat: Infinity, ease: "easeInOut" }
        }}
        className="relative w-8 h-8 rounded-full flex items-center justify-center group"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Outer glowing ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: [
              '0 0 10px rgba(99,102,241,0.4), 0 0 20px rgba(99,102,241,0.2), inset 0 0 10px rgba(99,102,241,0.1)',
              '0 0 20px rgba(99,102,241,0.6), 0 0 40px rgba(99,102,241,0.3), inset 0 0 15px rgba(99,102,241,0.2)',
              '0 0 10px rgba(99,102,241,0.4), 0 0 20px rgba(99,102,241,0.2), inset 0 0 10px rgba(99,102,241,0.1)',
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Rotating border ring */}
        <motion.div
          className="absolute -inset-1 rounded-full border-2 border-dashed border-indigo-400/50"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />

        {/* Pulsing background */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-blue-500/20"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Inner glass button */}
        <div className="relative w-7 h-7 rounded-full bg-slate-800/90 backdrop-blur-sm border border-indigo-400/60 flex items-center justify-center shadow-lg group-hover:border-indigo-300 transition-colors">
          <span className="text-[12px] font-bold italic text-indigo-300 group-hover:text-indigo-200 transition-colors">
            i
          </span>
        </div>

        {/* Shine effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </motion.button>

      {/* Portal popover — renders into body, always above everything */}
      {isOpen && createPortal(
        <motion.div
          ref={popoverRef}
          onMouseEnter={openPopover}
          onMouseLeave={closePopover}
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: 700,
            zIndex: 99999,
          }}
          className="bg-slate-900/98 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-6 shadow-2xl"
        >
          {/* Glow accent line */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

          <h3 className="text-base font-bold text-slate-100 mb-5 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            {title}
          </h3>

          {diagramSrc && (
            <img
              src={diagramSrc}
              alt="Diagram"
              className="w-full h-auto mb-5 rounded-xl border border-slate-700/50"
            />
          )}

          <div className="space-y-3">
            {description.map((item, index) => {
              const [label, ...rest] = item.split(':')
              const hasLabel = rest.length > 0 && label.length < 30
              return (
                <div key={index}
                  className="flex items-start gap-4 p-4 rounded-xl"
                  style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                  <span className="w-6 h-6 flex-shrink-0 rounded-lg flex items-center justify-center text-[11px] font-bold mt-0.5"
                    style={{ background: 'rgba(99,102,241,0.18)', color: '#818CF8' }}>
                    {index + 1}
                  </span>
                  <p className="text-[13px] text-slate-300 leading-relaxed">
                    {hasLabel
                      ? <><span className="font-semibold text-indigo-300">{label}:</span>{rest.join(':')}</>
                      : item}
                  </p>
                </div>
              )
            })}
          </div>
        </motion.div>,
        document.body
      )}
    </div>
  )
}
