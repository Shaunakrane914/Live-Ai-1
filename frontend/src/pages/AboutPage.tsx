import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.15
    }
  }
}

const pulseGlow = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(99,102,241,0.3), 0 0 40px rgba(99,102,241,0.1)',
      '0 0 40px rgba(99,102,241,0.5), 0 0 80px rgba(99,102,241,0.2)',
      '0 0 20px rgba(99,102,241,0.3), 0 0 40px rgba(99,102,241,0.1)'
    ],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const }
  }
}

// 3D Holographic Card for sections
function HolographicSection({ 
  children, 
  icon, 
  title, 
  color = '#6366f1',
  delay = 0 
}: { 
  children: React.ReactNode
  icon: string
  title: string
  color?: string
  delay?: number
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.23, 1, 0.32, 1] }}
      className="relative group"
      style={{ perspective: '1000px' }}
    >
      <motion.div 
        className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ 
          background: `linear-gradient(135deg, ${color}20, transparent, ${color}30)`,
          filter: 'blur(8px)'
        }}
      />
      <div 
        className="relative bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 overflow-hidden"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className="absolute top-0 left-0 w-16 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        <div className="absolute top-0 right-0 w-16 h-px bg-gradient-to-l from-transparent via-indigo-500/50 to-transparent" />
        <div className="absolute bottom-0 left-0 w-16 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        <div className="absolute bottom-0 right-0 w-16 h-px bg-gradient-to-l from-transparent via-indigo-500/50 to-transparent" />
        <motion.div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${color}10, transparent 70%)`
          }}
        />
        <div className="flex items-center gap-3 mb-4 relative z-10">
          <motion.div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ 
              background: `linear-gradient(135deg, ${color}20, ${color}10)`,
              border: `1px solid ${color}40`,
              boxShadow: `0 0 20px ${color}30`
            }}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            {icon}
          </motion.div>
          <h2 className="text-xl font-semibold tracking-tight" style={{ color }}>
            {title}
          </h2>
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </motion.section>
  )
}

export default function AboutPage() {
  const navigate = useNavigate()

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="min-h-full bg-[#0F1115] text-slate-300"
    >
      {/* Animated background particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-indigo-500/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 0.5, 0],
              scale: [0, 1, 0]
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-3xl mx-auto py-12 px-6 text-center">
        {/* Back Button */}
        <motion.button
          variants={fadeUp}
          onClick={() => navigate('/overview')}
          className="inline-flex items-center gap-2 text-[11px] text-slate-500 hover:text-indigo-400 transition-colors mb-12 group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Return to Command Center
        </motion.button>

        {/* Hero Title with 3D effect */}
        <motion.div 
          initial={{ opacity: 0, y: 50, rotateX: 15 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
          className="mb-12 text-center"
          style={{ perspective: '1000px' }}
        >
          <motion.div 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-30 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.4), transparent 70%)' }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.h1 
            className="text-4xl md:text-5xl font-bold text-slate-100 tracking-tight mb-4 relative"
            style={{
              textShadow: '0 0 40px rgba(99,102,241,0.5), 0 0 80px rgba(99,102,241,0.3)'
            }}
          >
            The Aegis Protocol
          </motion.h1>
          <motion.p 
            className="text-xl text-indigo-400 font-medium tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            The Theory of Everything
          </motion.p>
          <motion.div 
            className="mt-6 h-px w-32 mx-auto bg-gradient-to-r from-transparent via-indigo-500 to-transparent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          />
        </motion.div>

        {/* Content Sections */}
        <div className="space-y-6">
          <HolographicSection icon="🦖" title="The Problem: The Dinosaur Grid" color="#ef4444" delay={0.1}>
            <p className="leading-relaxed text-slate-300">
              Imagine the traditional power grid as a giant, clumsy dinosaur. A massive power plant sits miles away, pumping electricity in one direction to millions of homes. If a tree falls on the main power line, or if the plant fails, the whole city goes dark. Furthermore, if you put solar panels on your roof, the dinosaur doesn't let you sell your extra sunlight directly to your neighbor. You have to sell it back to the dinosaur for pennies, and they sell it to your neighbor for a massive profit.
            </p>
            <p className="leading-relaxed text-slate-300 mt-4">
              <span className="text-indigo-400 font-medium">AegisGrid fixes this</span> by chopping the dinosaur up into tiny, self-sustaining neighborhoods called "Microgrids."
            </p>
          </HolographicSection>

          <HolographicSection icon="🏘️" title="The Solution: Autonomous Neighbors" color="#22c55e" delay={0.2}>
            <p className="leading-relaxed text-slate-300">
              Imagine a neighborhood of 15 houses. Some houses have solar panels and batteries; some just consume power. We call them <span className="text-emerald-400 font-medium">"Prosumers"</span> (Producers + Consumers). Instead of relying on the giant power plant, these houses are wired together. When House A has too much sun, it automatically sends power to House B, which is currently running its air conditioning.
            </p>
            <p className="leading-relaxed text-slate-300 mt-4">
              But how do they agree on a price? And how do we stop the grid from crashing if a storm rolls in and everyone's solar panels stop working at the exact same time?
            </p>
          </HolographicSection>

          <HolographicSection icon="🏪" title="The Market: The Magic Vending Machine" color="#3b82f6" delay={0.3}>
            <p className="leading-relaxed text-slate-300">
              To let houses trade power instantly without a middleman taking a cut, we built an <span className="text-blue-400 font-medium">Automated Market Maker (AMM)</span> on the blockchain. Think of the AMM as a giant, magical vending machine in the center of the neighborhood.
            </p>
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-300">
                <span className="text-blue-400">→</span> If you have extra power, your house automatically dumps it into the vending machine and instantly gets paid in digital dollars (USDC).
              </p>
              <p className="text-sm text-blue-300 mt-2">
                <span className="text-blue-400">→</span> If you need power, your house automatically buys it from the vending machine.
              </p>
            </div>
            <p className="leading-relaxed text-slate-300 mt-4">
              There is no waiting for a buyer or a seller. The blockchain acts as a flawless, robotic accountant that settles the trades in milliseconds, permanently and transparently.
            </p>
          </HolographicSection>

          <HolographicSection icon="🧠" title="The Brain: The AI Traffic Cop" color="#a855f7" delay={0.4}>
            <p className="leading-relaxed text-slate-300">
              A vending machine is great, but energy is physical. If everyone tries to buy power from the machine at 6:00 PM when the sun goes down, the machine empties out, the grid runs out of electricity, and the neighborhood suffers a blackout.
            </p>
            <p className="leading-relaxed text-slate-300 mt-4">
              This is where our <span className="text-purple-400 font-medium">Artificial Intelligence</span> comes in. The AI acts like a super-smart traffic cop hovering over the neighborhood. It constantly watches the weather, the battery levels, and the grid's balance.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <p className="text-xs text-purple-400 uppercase tracking-wider mb-1">Cloud Cover</p>
                <p className="text-sm text-slate-300">AI raises trading fees → forces battery usage</p>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Sunny Day</p>
                <p className="text-sm text-slate-300">AI drops fees to zero → encourages storage</p>
              </div>
            </div>
            <p className="leading-relaxed text-slate-300 mt-4">
              <span className="text-purple-400 font-medium">The AI literally uses economics to control physical physics.</span>
            </p>
          </HolographicSection>

          <HolographicSection icon="🛡️" title="The Shield: The Secret Handshake" color="#f59e0b" delay={0.5}>
            <p className="leading-relaxed text-slate-300">
              There is one massive problem left: <span className="text-amber-400 font-medium">Privacy</span>. If all this trading is happening on a public blockchain, it means anyone in the world can see exactly how much power your house is using. A burglar could look at the blockchain, see that your energy usage just dropped to zero, and know you just left for vacation.
            </p>
            <p className="leading-relaxed text-slate-300 mt-4">
              To fix this, we use military-grade cryptography called <span className="text-emerald-400 font-medium">Zero-Knowledge Proofs (zk-SNARKs)</span>.
            </p>
            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-300 italic">
                "It is the mathematical equivalent of proving to a bouncer that you are over 21 years old, without ever showing them your ID card, your name, or your face."
              </p>
            </div>
            <p className="leading-relaxed text-slate-300 mt-4">
              When your house wants to sell energy to the vending machine, it uses a zk-SNARK to prove to the blockchain: <span className="text-emerald-400">"I promise I have 5 kilowatts of real solar power to sell,"</span> without ever revealing your house's location, ID, or raw physical data.
            </p>
          </HolographicSection>

          <HolographicSection icon="⚡" title="The Stress Test: The Chaos Engine" color="#ec4899" delay={0.6}>
            <p className="leading-relaxed text-slate-300">
              To prove this isn't just theory, we built a <span className="text-pink-400 font-medium">Chaos Engine</span>. During our live demo, we can intentionally trigger massive cloud covers, demand spikes, and even malicious hackers trying to steal money.
            </p>
            <p className="leading-relaxed text-slate-300 mt-4">
              You can literally watch the AI panic, adapt, and save the grid from blacking out in real-time, while the cryptography blocks the hackers.
            </p>
          </HolographicSection>

          {/* Closing Statement */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="pt-8 pb-4 text-center"
          >
            <motion.div
              className="inline-block p-6 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-emerald-500/20 border border-indigo-500/30 rounded-2xl"
              whileHover={{ scale: 1.02 }}
              {...pulseGlow}
            >
              <p className="text-xl md:text-2xl font-bold text-slate-100">
                Aegis isn't just a dashboard.
              </p>
              <p className="text-lg md:text-xl font-medium text-indigo-400 mt-2">
                It is a living, breathing, AI-governed economy.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
