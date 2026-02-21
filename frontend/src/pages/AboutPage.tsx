import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

function TerminalCard({
  icon,
  title,
  accentColor = '#4DA3FF',
  delay = 0,
  children,
}: {
  icon: string
  title: string
  accentColor?: string
  delay?: number
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.23, 1, 0.32, 1] }}
      className="w-full max-w-4xl mx-auto relative bg-[#171A21] border border-[#2A2E39]
        rounded-2xl p-10 md:p-12 flex flex-col gap-4
        hover:border-[#4DA3FF]/40 transition-colors duration-300"
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-14 right-14 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}50, transparent)` }}
      />

      {/* Header */}
      <div className="flex items-center gap-5">
        <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-[#0F1115] border border-[#2A2E39]
          flex items-center justify-center text-4xl">
          {icon}
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-[#EAE7DF] tracking-tight leading-snug">
          {title}
        </h2>
        <span
          className="ml-auto w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
        />
      </div>

      {/* Body */}
      <div className="text-lg md:text-xl text-[#9DA7B3] leading-relaxed md:leading-loose space-y-4 mt-2">
        {children}
      </div>
    </motion.div>
  )
}

export default function AboutPage() {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-full bg-[#0F1115]"
    >
      <div className="flex flex-col items-center w-full px-6 py-12">

        {/* Back button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate('/overview')}
          className="self-start max-w-4xl w-full mx-auto inline-flex items-center gap-2
            text-[11px] text-[#9DA7B3] hover:text-[#4DA3FF] transition-colors mb-12
            group font-mono uppercase tracking-widest"
        >
          <svg className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Return to Command Center
        </motion.button>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="text-center w-full max-w-4xl mx-auto mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-4">
            The Gridium Protocol
          </h1>
          <p className="text-xl md:text-2xl text-[#4DA3FF] font-mono uppercase tracking-widest mb-8">
            The Theory of Everything
          </p>
          <motion.div
            className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-[#4DA3FF]/60 to-transparent"
            initial={{ scaleX: 0, originX: 0.5 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.5, duration: 0.7 }}
          />
        </motion.div>

        {/* Vertical card stack */}
        <div className="flex flex-col items-center w-full gap-10">

          <TerminalCard icon="🦖" title="The Problem: The Dinosaur Grid" accentColor="#ef4444" delay={0.2}>
            <p>
              Imagine the traditional power grid as a giant, clumsy dinosaur. A massive power plant
              sits miles away, pumping electricity in one direction to millions of homes. If a tree
              falls on the main power line, or the plant fails, the whole city goes dark.
            </p>
            <p>
              If you put solar panels on your roof, the dinosaur doesn't let you sell your extra
              sunlight directly to your neighbor. You have to sell it back for pennies, and they
              sell it to your neighbor for a massive profit.
            </p>
            <p>
              <span className="text-[#4DA3FF] font-semibold">Gridium fixes this</span> by chopping
              the dinosaur into tiny, self-sustaining neighborhoods called{' '}
              <span className="text-[#EAE7DF] font-semibold">"Microgrids."</span>
            </p>
          </TerminalCard>

          <TerminalCard icon="🏘️" title="The Solution: Autonomous Neighbors" accentColor="#22c55e" delay={0.25}>
            <p>
              Imagine a neighborhood of 15 houses. Some have solar panels and batteries; some just
              consume power. We call them{' '}
              <span className="text-emerald-400 font-semibold">"Prosumers"</span> (Producers + Consumers).
            </p>
            <p>
              Instead of relying on the giant power plant, these houses are wired together. When House A
              has excess sun, it automatically sends power to House B running its air conditioning.
            </p>
            <p>
              But how do they agree on a price? And how do we stop the grid from crashing when
              everyone's solar panels stop working at the exact same time?
            </p>
          </TerminalCard>

          <TerminalCard icon="🏪" title="The Market: The Magic Vending Machine" accentColor="#3b82f6" delay={0.3}>
            <p>
              To let houses trade power instantly without a middleman, we built an{' '}
              <span className="text-blue-400 font-semibold">Automated Market Maker (AMM)</span> on
              the blockchain — a giant, magical vending machine at the center of the neighborhood.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-4 p-5 bg-[#0F1115] border border-[#2A2E39] rounded-xl">
                <span className="text-blue-400 font-bold text-xl mt-0.5">→</span>
                <p>Extra power? Your house dumps it in and gets paid instantly in USDC.</p>
              </div>
              <div className="flex items-start gap-4 p-5 bg-[#0F1115] border border-[#2A2E39] rounded-xl">
                <span className="text-blue-400 font-bold text-xl mt-0.5">→</span>
                <p>Need power? Your house buys it automatically. No waiting for a buyer or seller.</p>
              </div>
            </div>
            <p>
              The blockchain acts as a flawless, robotic accountant settling trades in milliseconds,
              permanently and transparently.
            </p>
          </TerminalCard>

          <TerminalCard icon="🧠" title="The Brain: The AI Traffic Cop" accentColor="#a855f7" delay={0.35}>
            <p>
              A vending machine is great, but energy is physical. If everyone buys power at 6:00 PM
              when the sun goes down, the machine empties out and the neighborhood suffers a blackout.
            </p>
            <p>
              This is where our{' '}
              <span className="text-purple-400 font-semibold">Artificial Intelligence</span> comes in —
              a super-smart traffic cop watching weather, battery levels, and the grid's real-time balance.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-[#0F1115] border border-[#2A2E39] rounded-xl">
                <p className="text-xs text-purple-400 uppercase tracking-widest font-mono mb-2">Cloud Cover</p>
                <p>AI raises fees → forces battery usage over live trading</p>
              </div>
              <div className="p-5 bg-[#0F1115] border border-[#2A2E39] rounded-xl">
                <p className="text-xs text-emerald-400 uppercase tracking-widest font-mono mb-2">Sunny Day</p>
                <p>AI drops fees to zero → actively encourages energy storage</p>
              </div>
            </div>
            <p className="text-purple-400 font-semibold">
              The AI literally uses economics to control physical physics.
            </p>
          </TerminalCard>

          <TerminalCard icon="🛡️" title="The Shield: The Secret Handshake" accentColor="#f59e0b" delay={0.4}>
            <p>
              There is one massive problem left:{' '}
              <span className="text-amber-400 font-semibold">Privacy</span>. If trading is on a
              public blockchain, anyone can see exactly how much power your house is using. A burglar
              could see your usage dropped to zero and know you left for vacation.
            </p>
            <p>
              To fix this, we use military-grade cryptography called{' '}
              <span className="text-emerald-400 font-semibold">Zero-Knowledge Proofs (zk-SNARKs)</span>.
            </p>
            <div className="p-6 bg-[#0F1115] border border-[#2A2E39] rounded-xl">
              <p className="italic text-amber-300/80">
                "Proving to a bouncer that you are over 21 — without ever showing your ID card,
                your name, or your face."
              </p>
            </div>
            <p>
              Your house proves{' '}
              <span className="text-emerald-400">"I have 5kW of real solar power to sell"</span>{' '}
              without revealing its location, ID, or raw physical data.
            </p>
          </TerminalCard>

          <TerminalCard icon="⚡" title="The Stress Test: The Chaos Engine" accentColor="#ec4899" delay={0.45}>
            <p>
              To prove this isn't just theory, we built a{' '}
              <span className="text-pink-400 font-semibold">Chaos Engine</span>. During our live demo,
              we can intentionally trigger massive cloud covers, demand spikes, and even malicious
              hackers trying to steal money.
            </p>
            <p>
              You can watch the AI panic, adapt, and save the grid from blacking out in real-time —
              while the cryptography blocks the hackers cold.
            </p>
          </TerminalCard>

          {/* Closing statement */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="w-full max-w-4xl mx-auto bg-[#171A21] border border-[#2A2E39]
              rounded-2xl p-10 md:p-12 text-center hover:border-[#4DA3FF]/40 transition-colors duration-300"
          >
            <div className="h-px w-20 mx-auto mb-8 bg-gradient-to-r from-transparent via-[#4DA3FF]/50 to-transparent" />
            <p className="text-2xl md:text-3xl font-bold text-white mb-3">
              Gridium isn't just a dashboard.
            </p>
            <p className="text-xl md:text-2xl font-medium text-[#4DA3FF] font-mono">
              It is a living, breathing, AI-governed economy.
            </p>
            <div className="h-px w-20 mx-auto mt-8 bg-gradient-to-r from-transparent via-[#4DA3FF]/50 to-transparent" />
          </motion.div>

        </div>
      </div>
    </motion.div>
  )
}
