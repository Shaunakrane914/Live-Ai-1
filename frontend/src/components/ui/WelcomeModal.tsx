import { useState } from 'react'

export function WelcomeModal() {
    const [visible, setVisible] = useState(true)
    const [rendered, setRendered] = useState(true)

    const handleEnter = () => {
        setVisible(false)
        setTimeout(() => setRendered(false), 500)
    }

    if (!rendered) return null

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'
                }`}
        >
            <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl p-8 border border-slate-500/30 shadow-2xl backdrop-blur-md"
                style={{ background: 'rgba(15, 23, 42, 0.65)' }}>

                {/* Decorative glows */}
                <div className="absolute -top-20 -left-20 h-40 w-40 rounded-full blur-3xl pointer-events-none"
                    style={{ background: 'rgba(59,130,246,0.22)' }} />
                <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full blur-3xl pointer-events-none"
                    style={{ background: 'rgba(16,185,129,0.22)' }} />

                <div className="relative z-10 text-slate-100">

                    {/* Header */}
                    <div className="mb-2 flex items-center gap-3">
                        <span className="flex h-3 w-3 rounded-full bg-emerald-400 animate-pulse"
                            style={{ boxShadow: '0 0 10px rgba(52,211,153,0.8)' }} />
                        <h1 className="text-3xl font-bold tracking-tight text-white">AEGISGRID PROTOCOL</h1>
                    </div>
                    <p className="mb-8 text-lg text-slate-300">The decentralized, AI-governed energy market.</p>

                    <p className="mb-6 text-sm leading-relaxed text-slate-400">
                        Welcome to the live microgrid simulation. You are viewing 15 autonomous prosumer nodes
                        reacting to real-world physics telemetry in real-time.
                    </p>

                    {/* Feature cards */}
                    <div className="mb-8 space-y-3">
                        {[
                            {
                                icon: '🧠',
                                title: 'AI Policy Engine',
                                body: 'A live DDPG agent dynamically adjusts AMM swap fees to prevent grid blackouts during demand spikes.',
                            },
                            {
                                icon: '🔗',
                                title: 'Web3 Settlement',
                                body: 'Trades are executed via an ERC-1155 automated market maker, reducing Ethereum gas settlement costs by 90%.',
                            },
                            {
                                icon: '🛡️',
                                title: 'Zero-Knowledge Privacy',
                                body: 'Node physical locations and local load data are masked using Groth16 zk-SNARK cryptographic proofs.',
                            },
                        ].map(({ icon, title, body }) => (
                            <div key={title}
                                className="flex items-start gap-4 rounded-lg p-4 border border-slate-700/50"
                                style={{ background: 'rgba(30,41,59,0.45)' }}>
                                <span className="text-2xl leading-none">{icon}</span>
                                <div>
                                    <h3 className="font-semibold text-white mb-0.5">{title}</h3>
                                    <p className="text-sm text-slate-400">{body}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <button
                        onClick={handleEnter}
                        className="w-full rounded-lg px-4 py-3 font-semibold text-white shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                        style={{
                            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                            boxShadow: '0 0 24px rgba(79,70,229,0.35)',
                        }}
                        onMouseEnter={e =>
                            (e.currentTarget.style.boxShadow = '0 0 36px rgba(99,102,241,0.55)')
                        }
                        onMouseLeave={e =>
                            (e.currentTarget.style.boxShadow = '0 0 24px rgba(79,70,229,0.35)')
                        }
                    >
                        [ Initialize Command Center ]
                    </button>
                </div>
            </div>
        </div>
    )
}
