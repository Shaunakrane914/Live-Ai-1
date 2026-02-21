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
        <aside className="hidden lg:flex flex-col w-80 border-l border-slate-800 bg-slate-950/80 backdrop-blur px-4 py-4 gap-4">
            <section>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase mb-3">
                    Protocol Telemetry
                </p>
                <div className="space-y-3">
                    <MetricRow label="Grid Load" value={`${gridLoad.toFixed(1)} kW`} tone="load" />
                    <MetricRow label="Generation" value={`${generation.toFixed(1)} kW`} tone="gen" />
                    <MetricRow label="Energy Price" value={price.toFixed(4)} unit="USDC/kWh" />
                    <MetricRow label="Swap Fee" value={swapFee.toFixed(2)} unit="%" />
                    <MetricRow label="Battery SoC" value={batterySoc.toFixed(1)} unit="%" />
                </div>
            </section>

            <section className="mt-2">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase mb-3">
                    AI Telemetry
                </p>
                <div className="space-y-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
                        <p className="text-[10px] text-slate-500 uppercase tracking-[0.16em]">
                            Imbalance
                        </p>
                        <p className={`metric-value text-sm font-semibold ${imbalanceColor}`}>
                            {imbalanceValue} <span className="text-[11px] text-slate-500">kW</span>
                        </p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
                        <p className="text-[10px] text-slate-500 uppercase tracking-[0.16em]">
                            RL Reward
                        </p>
                        <p className="metric-value text-sm font-semibold text-indigo-300">
                            {reward.toFixed(3)}
                        </p>
                    </div>
                </div>
            </section>

            <section className="mt-2">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase mb-3">
                    AMM Reserves
                </p>
                <div className="space-y-2">
                    <MetricRow label="Energy Reserve" value={energyReserve.toFixed(1)} unit="kWh" />
                    <MetricRow label="Stable Reserve" value={stableReserve.toFixed(1)} unit="USDC" />
                </div>
            </section>
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
    let color = 'text-slate-100'
    if (tone === 'gen') color = 'text-emerald-400'
    if (tone === 'load') color = 'text-rose-400'

    return (
        <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-slate-500">
                {label}
            </span>
            <span className={`metric-value text-[13px] font-semibold ${color}`}>
                {value}
                {unit && <span className="ml-1 text-[11px] text-slate-500">{unit}</span>}
            </span>
        </div>
    )
}

