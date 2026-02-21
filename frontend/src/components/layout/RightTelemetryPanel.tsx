import { useGridStore } from '../../store/useGridStore'

export default function RightTelemetryPanel() {
    const {
        gridLoad,
        generation,
        price,
        swapFee,
        batterySoc,
        gridImbalance,
        reward,
        energyReserve,
        stableReserve,
    } = useGridStore()

    const imbalanceColor =
        Math.abs(gridImbalance) > 20 ? 'text-rose-400'
            : gridImbalance >= 0 ? 'text-emerald-400'
                : 'text-rose-400'

    const imbalanceValue = `${gridImbalance >= 0 ? '+' : ''}${gridImbalance.toFixed(2)}`

    return (
        <aside className="hidden lg:flex flex-col w-72 bg-slate-950/60 backdrop-blur px-4 py-5">
            {/* Protocol Metrics */}
            <div className="space-y-4">
                <MetricRow label="Grid Load" value={`${gridLoad.toFixed(1)}`} unit="kW" tone="load" />
                <MetricRow label="Generation" value={`${generation.toFixed(1)}`} unit="kW" tone="gen" />
                <MetricRow label="Price" value={price.toFixed(4)} unit="USDC" />
                <MetricRow label="Swap Fee" value={swapFee.toFixed(2)} unit="%" />
                <MetricRow label="Battery" value={batterySoc.toFixed(1)} unit="%" />
            </div>

            {/* AI Stats - Compact inline */}
            <div className="mt-4">
                <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wider mb-2">AI Controller</p>
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-slate-500">Imbalance</span>
                    <span className={`text-[13px] font-semibold ${imbalanceColor}`}>
                        {imbalanceValue} <span className="text-[10px] text-slate-500">kW</span>
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Reward</span>
                    <span className="text-[13px] font-semibold text-indigo-300">
                        {reward.toFixed(3)}
                    </span>
                </div>
            </div>

            {/* Reserves - Subtle section */}
            <div className="mt-4">
                <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wider mb-2">Reserves</p>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">Energy</span>
                        <span className="text-[13px] font-semibold text-slate-200">
                            {energyReserve.toFixed(1)} <span className="text-[10px] text-slate-500">kWh</span>
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">Stable</span>
                        <span className="text-[13px] font-semibold text-slate-200">
                            {stableReserve.toFixed(1)} <span className="text-[10px] text-slate-500">USDC</span>
                        </span>
                    </div>
                </div>
            </div>
        </aside>
    )
}

interface MetricRowProps {
    label: string
    value: string
    unit?: string
    tone?: 'load' | 'gen'
}

function MetricRow({ label, value, unit, tone }: MetricRowProps) {
    let color = 'text-slate-200'
    if (tone === 'gen') color = 'text-emerald-400'
    if (tone === 'load') color = 'text-rose-400'

    return (
        <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-slate-500">{label}</span>
            <span className={`text-[13px] font-semibold ${color}`}>
                {value}
                {unit && <span className="ml-1 text-[10px] text-slate-500">{unit}</span>}
            </span>
        </div>
    )
}

