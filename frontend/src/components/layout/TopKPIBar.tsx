import { useGridStore } from '../../store/useGridStore'

interface PillConfig {
    label: string
    value: string
    unit: string
    bg: string           // pill background
    accent: string       // text / icon color
    icon: string
    trend?: 'up' | 'down' | null
}

export default function TopKPIBar() {
    const { gridLoad, generation, price, swapFee, connected } = useGridStore()

    const imbalance = generation - gridLoad
    const loadBad = Math.abs(imbalance) > 20

    const pills: PillConfig[] = [
        {
            label: 'Grid Load',
            value: gridLoad.toFixed(1),
            unit: 'kW',
            bg: loadBad ? 'rgba(255,145,0,0.10)' : 'rgba(229,246,253,0.85)',
            accent: loadBad ? '#E65100' : '#0277BD',
            icon: '⚡',
            trend: imbalance > 0 ? 'down' : 'up',
        },
        {
            label: 'Generation',
            value: generation.toFixed(1),
            unit: 'kW',
            bg: 'rgba(232,245,233,0.85)',
            accent: '#2E7D32',
            icon: '☀',
            trend: 'up',
        },
        {
            label: 'Energy Price',
            value: price.toFixed(4),
            unit: 'USDC/kWh',
            bg: price > 0.1 ? 'rgba(255,243,224,0.85)' : 'rgba(232,245,233,0.85)',
            accent: price > 0.1 ? '#E65100' : '#2E7D32',
            icon: '◈',
        },
        {
            label: 'Swap Fee',
            value: swapFee.toFixed(2),
            unit: '%  RL',
            bg: 'rgba(237,231,246,0.85)',
            accent: '#6A1B9A',
            icon: '⬡',
        },
        {
            label: 'ZK Privacy',
            value: 'ACTIVE',
            unit: '',
            bg: 'rgba(224,247,250,0.85)',
            accent: '#00838F',
            icon: '🔐',
        },
    ]

    return (
        <header
            className="flex-shrink-0 flex items-center gap-2.5 px-4 h-[64px] z-20 border-b overflow-x-auto"
            style={{
                background: 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(20px)',
                borderColor: 'rgba(0,0,0,0.07)',
            }}
        >
            {/* Metric pills */}
            {pills.map(pill => (
                <div
                    key={pill.label}
                    className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl flex-shrink-0 border"
                    style={{
                        background: pill.bg,
                        borderColor: `${pill.accent}22`,
                        minWidth: 130,
                    }}
                >
                    <span className="text-[16px] leading-none">{pill.icon}</span>
                    <div>
                        <p className="text-[9px] uppercase tracking-widest font-semibold"
                            style={{ color: `${pill.accent}99` }}>
                            {pill.label}
                        </p>
                        <div className="flex items-baseline gap-1">
                            <span
                                className="metric-value text-[15px] font-bold tracking-tight"
                                style={{ color: pill.accent }}
                            >
                                {pill.value}
                            </span>
                            {pill.unit && (
                                <span className="text-[9px] font-medium" style={{ color: `${pill.accent}88` }}>
                                    {pill.unit}
                                </span>
                            )}
                            {pill.trend && (
                                <span className="text-[9px] font-bold ml-0.5" style={{ color: pill.accent }}>
                                    {pill.trend === 'up' ? '▲' : '▼'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Connection indicator */}
            <div
                className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-2xl border"
                style={{
                    background: connected ? 'rgba(232,245,233,0.85)' : 'rgba(255,243,224,0.85)',
                    borderColor: connected ? '#2E7D3222' : '#E6510022',
                }}
            >
                <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                        background: connected ? '#2E7D32' : '#E65100',
                        boxShadow: `0 0 0 3px ${connected ? '#2E7D3228' : '#E6510028'}`,
                    }}
                />
                <div>
                    <p className="text-[9px] uppercase tracking-widest font-semibold"
                        style={{ color: connected ? '#2E7D3299' : '#E6510099' }}>
                        Status
                    </p>
                    <p className="metric-value text-[12px] font-bold"
                        style={{ color: connected ? '#2E7D32' : '#E65100' }}>
                        {connected ? 'Live' : 'Mock sim'}
                    </p>
                </div>
            </div>
        </header>
    )
}
