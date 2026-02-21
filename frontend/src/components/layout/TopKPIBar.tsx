import { useGridStore } from '../../store/useGridStore'

interface PillConfig {
    label: string
    value: string
    unit: string
    color: string
    trend?: 'up' | 'down' | null
}

export default function TopKPIBar() {
    const { gridLoad, generation, price, swapFee, batterySoc, connected } = useGridStore()

    const imbalance = generation - gridLoad
    const loadBad = Math.abs(imbalance) > 20

    const pills: PillConfig[] = [
        { label: 'Grid Load', value: gridLoad.toFixed(1), unit: 'kW', color: loadBad ? '#DC2626' : '#1D4ED8', trend: imbalance > 0 ? 'down' : 'up' },
        { label: 'Generation', value: generation.toFixed(1), unit: 'kW', color: '#059669', trend: 'up' },
        { label: 'Energy Price', value: price.toFixed(4), unit: 'USDC/kWh', color: price > 0.1 ? '#D97706' : '#059669' },
        { label: 'Swap Fee', value: swapFee.toFixed(2), unit: '%', color: '#7C3AED' },
        { label: 'Battery SoC', value: batterySoc.toFixed(1), unit: '%', color: batterySoc < 30 ? '#DC2626' : batterySoc < 60 ? '#D97706' : '#059669', trend: batterySoc > 50 ? 'up' : 'down' },
    ]

    return (
        <header className="flex-shrink-0 flex items-center gap-0 h-[64px] z-20 border-b border-[#E5E7EB] bg-white overflow-x-auto">
            {/* Brand mark */}
            <div className="flex-shrink-0 flex items-center gap-2.5 px-6 h-full border-r border-[#E5E7EB]" style={{ minWidth: 212 }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)' }}>Æ</div>
                <div>
                    <p className="text-[13px] font-bold text-[#111827] leading-tight">GridiumGrid</p>
                    <p className="text-[10px] text-[#9CA3AF] leading-tight tracking-wide">Protocol V1</p>
                </div>
            </div>

            {/* Divider */}
            <div className="flex-1 flex items-center gap-0 h-full overflow-x-auto px-4 gap-1">
                {pills.map((pill) => (
                    <div key={pill.label}
                        className="flex items-center gap-3 px-4 h-10 rounded-lg flex-shrink-0 border border-[#F3F4F6] bg-[#FAFAFA]"
                        style={{ minWidth: 150 }}
                    >
                        <div>
                            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider leading-none mb-0.5">
                                {pill.label}
                            </p>
                            <div className="flex items-baseline gap-1">
                                <span className="metric-value text-[15px] font-bold" style={{ color: pill.color }}>
                                    {pill.value}
                                </span>
                                <span className="text-[10px] font-medium text-[#9CA3AF]">{pill.unit}</span>
                                {pill.trend && (
                                    <span className="text-[10px] font-bold" style={{ color: pill.color }}>
                                        {pill.trend === 'up' ? '▲' : '▼'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Connection status */}
            <div className="flex-shrink-0 flex items-center gap-2 px-5 h-full border-l border-[#E5E7EB]">
                <span className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: connected ? '#10B981' : '#F59E0B' }} />
                <span className="text-[12px] font-semibold" style={{ color: connected ? '#059669' : '#D97706' }}>
                    {connected ? 'Live' : 'Mock'}
                </span>
            </div>
        </header>
    )
}
