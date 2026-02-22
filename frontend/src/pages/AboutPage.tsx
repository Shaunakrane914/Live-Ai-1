import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

function SidebarCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-[#171A21]/60 border border-[#2A2E39]/60 rounded-lg p-4">
      <h3 className="text-xs font-bold text-[#4DA3FF] uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  )
}

export default function AboutPage() {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-[#0F1115] overflow-y-auto w-full pb-20"
    >
      <div className="max-w-6xl mx-auto w-full px-6 lg:px-12 pt-12">
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate('/overview')}
          className="inline-flex items-center gap-2
            text-[11px] text-[#9DA7B3] hover:text-[#4DA3FF] transition-colors
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
          className="mt-8"
        >
          <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-4">
            The Gridium Protocol
          </h1>
          <p className="text-xl md:text-2xl text-[#4DA3FF] font-mono uppercase tracking-widest">
            The Theory of Everything
          </p>
        </motion.div>
      </div>

      {/* Main two-column content */}
      <div className="max-w-6xl mx-auto w-full px-6 lg:px-12 mt-12 flex flex-col lg:flex-row gap-16">
        {/* LEFT COLUMN - Story */}
        <div className="lg:w-2/3 flex flex-col gap-10">
          <section>
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3 mb-4 pb-2 border-b border-slate-800">
              <span>🦖</span>
              The Problem: The Dinosaur Grid
            </h2>
            <div className="space-y-4">
              <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                Imagine the traditional power grid as a giant, clumsy dinosaur. A massive power plant
                sits miles away, pumping electricity in one direction to millions of homes. If a tree
                falls on the main power line, or the plant fails, the whole city goes dark.
              </p>
              <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                If you put solar panels on your roof, the dinosaur doesn't let you sell your extra
                sunlight directly to your neighbor. You have to sell it back for pennies, and they
                sell it to your neighbor for a massive profit.
              </p>
              <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                <span className="text-[#4DA3FF] font-semibold">Gridium fixes this</span> by chopping
                the dinosaur into tiny, self-sustaining neighborhoods called{' '}
                <span className="text-slate-100 font-semibold">"Microgrids."</span>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3 mb-4 pb-2 border-b border-slate-800">
              <span>🏘️</span>
              The Solution: Autonomous Neighbors
            </h2>
            <div className="space-y-4">
              <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                Imagine a neighborhood of 15 houses. Some have solar panels and batteries; some just
                consume power. We call them{' '}
                <span className="text-emerald-400 font-semibold">"Prosumers"</span> (Producers + Consumers).
              </p>
              <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                Instead of relying on the giant power plant, these houses are wired together. When House A
                has excess sun, it automatically sends power to House B running its air conditioning.
              </p>
              <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                But how do they agree on a price? And how do we stop the grid from crashing when
                everyone's solar panels stop working at the exact same time?
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3 mb-4 pb-2 border-b border-slate-800">
              <span>🏪</span>
              The Market: The Magic Vending Machine
            </h2>
            <div className="space-y-4">
              <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                To let houses trade power instantly without a middleman, we built an{' '}
                <span className="text-blue-400 font-semibold">Automated Market Maker (AMM)</span> on
                the blockchain — a giant, magical vending machine at the center of the neighborhood.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-[#0F1115] border border-[#2A2E39] rounded-xl">
                  <span className="text-blue-400 font-bold text-lg mt-0.5">→</span>
                  <p className="text-base md:text-lg text-slate-300 leading-relaxed">Extra power? Your house dumps it in and gets paid instantly in USDC.</p>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#0F1115] border border-[#2A2E39] rounded-xl">
                  <span className="text-blue-400 font-bold text-lg mt-0.5">→</span>
                  <p className="text-base md:text-lg text-slate-300 leading-relaxed">Need power? Your house buys it automatically. No waiting for a buyer or seller.</p>
                </div>
              </div>
              <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                The blockchain acts as a flawless, robotic accountant settling trades in milliseconds,
                permanently and transparently.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3 mb-4 pb-2 border-b border-slate-800">
              <span>🧠</span>
              The Brain: The AI Traffic Cop
            </h2>
            <div className="space-y-4">
              <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                A vending machine is great, but energy is physical. If everyone buys power at 6:00 PM
                when the sun goes down, the machine empties out and the neighborhood suffers a blackout.
              </p>
              <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                This is where our{' '}
                <span className="text-purple-400 font-semibold">Artificial Intelligence</span> comes in —
                a super-smart traffic cop watching weather, battery levels, and the grid's real-time balance.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#0F1115] border border-[#2A2E39] rounded-xl">
                  <p className="text-xs text-purple-400 uppercase tracking-widest font-mono mb-2">Cloud Cover</p>
                  <p className="text-base md:text-lg text-slate-300 leading-relaxed">AI raises fees → forces battery usage over live trading</p>
                </div>
                <div className="p-4 bg-[#0F1115] border border-[#2A2E39] rounded-xl">
                  <p className="text-xs text-emerald-400 uppercase tracking-widest font-mono mb-2">Sunny Day</p>
                  <p className="text-base md:text-lg text-slate-300 leading-relaxed">AI drops fees to zero → actively encourages energy storage</p>
                </div>
              </div>
              <p className="text-base md:text-lg text-purple-400 font-semibold leading-relaxed">
                The AI literally uses economics to control physical physics.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3 mb-4 pb-2 border-b border-slate-800">
              <span>🛡️</span>
              The Shield: The Secret Handshake
            </h2>
            <div className="space-y-4">
              <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                There is one massive problem left:{' '}
                <span className="text-amber-400 font-semibold">Privacy</span>. If trading is on a
                public blockchain, anyone can see exactly how much power your house is using. A burglar
                could see your usage dropped to zero and know you left for vacation.
              </p>
              <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                To fix this, we use military-grade cryptography called{' '}
                <span className="text-emerald-400 font-semibold">Zero-Knowledge Proofs (zk-SNARKs)</span>.
              </p>
              <div className="p-5 bg-[#0F1115] border border-[#2A2E39] rounded-xl">
                <p className="text-base md:text-lg italic text-amber-300/80 leading-relaxed">
                  "Proving to a bouncer that you are over 21 — without ever showing your ID card,
                  your name, or your face."
                </p>
              </div>
              <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                Your house proves{' '}
                <span className="text-emerald-400">"I have 5kW of real solar power to sell"</span>{' '}
                without revealing its location, ID, or raw physical data.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3 mb-4 pb-2 border-b border-slate-800">
              <span>⚡</span>
              The Stress Test: The Chaos Engine
            </h2>
            <div className="space-y-4">
              <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                To prove this isn't just theory, we built a{' '}
                <span className="text-pink-400 font-semibold">Chaos Engine</span>. During our live demo,
                we can intentionally trigger massive cloud covers, demand spikes, and even malicious
                hackers trying to steal money.
              </p>
              <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                You can watch the AI panic, adapt, and save the grid from blacking out in real-time —
                while the cryptography blocks the hackers cold.
              </p>
            </div>
          </section>

          <section>
            <div className="pt-6 border-t border-slate-800">
              <p className="text-xl md:text-2xl font-bold text-slate-100">
                Gridium isn't just a dashboard.
              </p>
              <p className="text-lg md:text-xl font-medium text-[#4DA3FF] font-mono mt-2">
                It is a living, breathing, AI-governed economy.
              </p>
            </div>
          </section>
          {/* Go-To-Market & Disruptive Potential */}
          <section>
            <div className="mt-4 pt-8 border-t border-slate-800">
              <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3 mb-6 pb-2 border-b border-slate-800">
                <span>📈</span>
                Go-To-Market &amp; Disruptive Potential
              </h2>
              <div className="space-y-6">
                <div className="p-5 rounded-xl border border-[#2A2E39] bg-[#0F1115]">
                  <p className="text-xs font-mono uppercase tracking-widest text-[#4DA3FF] mb-3">Validated Demand &amp; Market Fit</p>
                  <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                    The current grid infrastructure is failing under the weight of renewable energy
                    integration — a validated demand signal backed by the global surge in rooftop solar
                    adoption and government DER mandates. Gridium directly aligns with this massive market
                    shift by offering an AI-governed, AMM-based microgrid, providing a{' '}
                    <span className="text-[#4DA3FF] font-semibold">robust strategy indicating high adoption potential</span>{' '}
                    for modern residential developers, solar-equipped municipalities, and decentralised
                    autonomous communities.
                  </p>
                </div>
                <div className="p-5 rounded-xl border border-purple-900/50 bg-purple-950/20">
                  <p className="text-xs font-mono uppercase tracking-widest text-purple-400 mb-3">Vision &amp; Eventual Dominance</p>
                  <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                    Gridium is not an incremental improvement — it is a{' '}
                    <span className="text-purple-300 font-semibold">breakthrough approach</span>{' '}
                    with a visionary product positioned for longevity and eventual dominance in the{' '}
                    <span className="text-emerald-400 font-semibold">DePIN (Decentralised Physical Infrastructure Network)</span>{' '}
                    sector. By merging zero-knowledge privacy with reinforcement learning on top of a
                    physical energy substrate, Gridium has the high potential to lead or transform the
                    entire market of peer-to-peer energy trading — setting a new primitive that every
                    future microgrid protocol will be measured against.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN - Tech Stack Sidebar */}
        <div className="lg:w-1/3">
          <div className="sticky top-8 flex flex-col gap-4">
            <SidebarCard title="🔧 Tech Stack">
              <div className="space-y-2 text-sm text-[#9DA7B3]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4DA3FF]" />
                  <span>React + TypeScript</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4DA3FF]" />
                  <span>Tailwind CSS</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4DA3FF]" />
                  <span>Framer Motion</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4DA3FF]" />
                  <span>Three.js / R3F</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4DA3FF]" />
                  <span>Zustand</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4DA3FF]" />
                  <span>WebSocket</span>
                </div>
              </div>
            </SidebarCard>

            <SidebarCard title="🤖 ML Models">
              <div className="space-y-2 text-sm text-[#9DA7B3]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>DDPG Agent</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Reinforcement Learning</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Actor-Critic</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Experience Replay</span>
                </div>
              </div>
            </SidebarCard>

            <SidebarCard title="📊 Dataset">
              <div className="space-y-2 text-sm text-[#9DA7B3]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>15 Prosumer Nodes</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Solar Generation Data</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Load Patterns</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Battery SOC</span>
                </div>
              </div>
            </SidebarCard>

            <SidebarCard title="⚡ Live">
              <div className="space-y-2 text-sm text-[#9DA7B3]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>WebSocket Updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>AMM Price Oracle</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>3D Visualization</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>ZK Proofs Live</span>
                </div>
              </div>
            </SidebarCard>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

