/**
 * SwapFeeChart — lightweight-charts v5
 * ─────────────────────────────────────
 * Reads OHLC history from Zustand (accumulated since app start in WebSocketProvider).
 * Subscribes to ohlcCandles updates for live streaming — zero React re-renders.
 */

import { useEffect, useRef } from 'react'
import {
    createChart,
    CandlestickSeries,
    ColorType,
    type IChartApi,
    type ISeriesApi,
} from 'lightweight-charts'
import { useGridStore } from '../../store/useGridStore'

// ── Palette — dark trading terminal ───────────────────────────────
const THEME = {
    bg: '#0F1923',
    gridLines: '#1E2D3D',
    textColor: '#5D7896',
    bull: '#00C878',   // fee dropped → grid stabilised
    bear: '#FF4D6D',   // fee spiked  → DDPG reacting to chaos
}

export default function SwapFeeChart() {
    const containerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
    const chartCleanupRef = useRef<(() => void) | null>(null)

    // ── Mount: create chart + seed with all accumulated history ───
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        // Defer so layout is complete and container has non-zero size
        const id = requestAnimationFrame(() => {
            const w = Math.max(container.clientWidth || 400, 100)
            const h = Math.max(container.clientHeight || 260, 100)

            const chart = createChart(container, {
                layout: {
                    background: { type: ColorType.Solid, color: THEME.bg },
                    textColor: THEME.textColor,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10,
                },
                grid: {
                    vertLines: { color: THEME.gridLines },
                    horzLines: { color: THEME.gridLines },
                },
                crosshair: {
                    vertLine: { color: 'rgba(255,255,255,0.15)', labelBackgroundColor: '#1E2D3D' },
                    horzLine: { color: 'rgba(255,255,255,0.15)', labelBackgroundColor: '#1E2D3D' },
                },
                rightPriceScale: {
                    borderColor: THEME.gridLines,
                    scaleMargins: { top: 0.25, bottom: 0.25 },
                    minimumWidth: 60,
                },
                timeScale: {
                    borderColor: THEME.gridLines,
                    timeVisible: true,
                    secondsVisible: true,
                    fixLeftEdge: false,
                    lockVisibleTimeRangeOnResize: true,
                },
                handleScroll: {
                    mouseWheel: false,
                    pressedMouseMove: false,
                    horzTouchDrag: false,
                    vertTouchDrag: false,
                },
                handleScale: {
                    mouseWheel: false,
                    pinch: false,
                    axisPressedMouseMove: false,
                },
                width: w,
                height: h,
            })

            // Pad price range so chart never zooms in too tight (fixes remount zoom)
            const paddedAutoscale = (base: () => { priceRange?: { minValue: number; maxValue: number } } | null) => {
                const info = base()
                if (!info?.priceRange) return info
                const { minValue, maxValue } = info.priceRange
                const span = Math.max(maxValue - minValue, 0.5)
                const pad = span * 0.3
                return {
                    ...info,
                    priceRange: {
                        minValue: minValue - pad,
                        maxValue: maxValue + pad,
                    },
                }
            }

            const series = chart.addSeries(CandlestickSeries, {
                upColor: THEME.bull,
                downColor: THEME.bear,
                borderUpColor: THEME.bull,
                borderDownColor: THEME.bear,
                wickUpColor: THEME.bull,
                wickDownColor: THEME.bear,
                autoscaleInfoProvider: paddedAutoscale,
            })

            chartRef.current = chart
            seriesRef.current = series

            // ── Seed with ALL candles accumulated since app start ──────
            const history = useGridStore.getState().ohlcCandles
            if (history.length > 0) {
                series.setData([...history])
                // Defer so chart applies data first; prevents zoomed-in view on remount
                requestAnimationFrame(() => {
                    chart.timeScale().fitContent()
                })
            }

            // Responsive resize
            const ro = new ResizeObserver(() => {
                if (container && container.clientWidth && container.clientHeight) {
                    chart.resize(container.clientWidth, container.clientHeight)
                }
            })
            ro.observe(container)
            chartCleanupRef.current = () => {
                ro.disconnect()
                chart.remove()
                chartRef.current = null
                seriesRef.current = null
            }
        })

        return () => {
            cancelAnimationFrame(id)
            chartCleanupRef.current?.()
            chartCleanupRef.current = null
        }
    }, [])

    // ── Subscribe to new candles from Zustand (outside render cycle)
    useEffect(() => {
        let prevLen = useGridStore.getState().ohlcCandles.length

        const unsub = useGridStore.subscribe((state) => {
            if (!seriesRef.current) return
            const candles = state.ohlcCandles
            if (candles.length === prevLen) return  // nothing new

            // Push only the newly added candle(s)
            const newCandles = candles.slice(prevLen)
            newCandles.forEach(c => seriesRef.current!.update(c))
            prevLen = candles.length
        })
        return unsub
    }, [])

    // ── Refit chart when tab becomes visible (prevents zoom issues)
    useEffect(() => {
        const handleVisibility = () => {
            if (!document.hidden && chartRef.current) {
                requestAnimationFrame(() => {
                    chartRef.current?.timeScale().fitContent()
                })
            }
        }
        document.addEventListener('visibilitychange', handleVisibility)
        return () => document.removeEventListener('visibilitychange', handleVisibility)
    }, [])

    return (
        <div className="relative w-full h-full rounded-2xl overflow-hidden">
            {/* Header overlay */}
            <div
                className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2.5 pointer-events-none"
                style={{ background: 'linear-gradient(180deg, rgba(15,25,35,0.95) 0%, transparent 100%)' }}
            >
                <div className="flex items-center gap-2">
                    <span
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ background: THEME.bull, boxShadow: `0 0 6px ${THEME.bull}` }}
                    />
                    <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: '#5D7896' }}>
                        DDPG Swap Fee  ·  OHLC
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,200,120,0.12)', color: THEME.bull }}>
                        3s candles
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,77,109,0.12)', color: THEME.bear }}>
                        6 ticks / candle
                    </span>
                </div>
            </div>

            {/* Canvas mount point — min-height so chart gets non-zero size before rAF */}
            <div ref={containerRef} className="w-full h-full min-h-[200px]" />
        </div>
    )
}
