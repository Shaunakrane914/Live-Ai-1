import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

interface PageInfoProps {
  title: string
  description: string[]
  diagramSrc?: string
}

export default function PageInfo({ title, description, diagramSrc }: PageInfoProps) {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

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

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative inline-block" style={{ perspective: '1000px' }}>
      {/* 3D Glowing Trigger Button */}
      <motion.button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
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
              '0 0 10px rgba(99,102,241,0.4), 0 0 20px rgba(99,102,241,0.2), inset 0 0 10px rgba(99,102,241,0.1)'
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

      {/* Popover */}
      {isOpen && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute top-full left-0 mt-3 w-[640px] bg-slate-900/95 backdrop-blur-xl border border-indigo-500/30 rounded-xl p-4 shadow-2xl z-50"
        >
          {/* Glow accent */}
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
          
          <h3 className="text-sm font-semibold text-slate-100 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            {title}
          </h3>
          
          {diagramSrc && (
            <img 
              src={diagramSrc} 
              alt="Diagram" 
              className="w-full h-auto mb-4 rounded-lg border border-slate-700/50"
            />
          )}
          
          <ul className="space-y-2">
            {description.map((item, index) => (
              <li key={index} className="text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
                <span className="text-indigo-400 mt-1">›</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  )
}
