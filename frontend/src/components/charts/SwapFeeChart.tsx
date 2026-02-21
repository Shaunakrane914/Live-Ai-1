/**
 * SwapFeeChart — lightweight-charts v5
 * ─────────────────────────────────────
 * Canvas-based OHLC candlestick chart for DDPG swap fee visualisation.
 *
 * Architecture:
 *   - TradingView `lightweight-charts` v5 renders directly to a <canvas>
 *   - Chart instance held in a React ref → zero React re-renders on tick
 *   - Zustand .subscribe() fires the OHLC aggregator on every tick
 *   - series.update() is called imperatively → smooth 60-FPS animation
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
import { useOhlcAggregator } from '../../hooks/useOhlcAggregator'
import type { OhlcCandle } from '../../hooks/useOhlcAggregator'

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
    const aggregator = useOhlcAggregator()

    // ── Mount: create chart once ───────────────────────────────────
    useEffect(() => {
        if (!containerRef.current) return

        const chart = createChart(containerRef.current, {
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
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            timeScale: {
                borderColor: THEME.gridLines,
                timeVisible: true,
                secondsVisible: true,
                fixLeftEdge: false,
            },
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
        })

        // v5 API: chart.addSeries(CandlestickSeries, options)
        const series = chart.addSeries(CandlestickSeries, {
            upColor: THEME.bull,
            downColor: THEME.bear,
            borderUpColor: THEME.bull,
            borderDownColor: THEME.bear,
            wickUpColor: THEME.bull,
            wickDownColor: THEME.bear,
        })

        chartRef.current = chart
        seriesRef.current = series

        // Responsive resize
        const ro = new ResizeObserver(() => {
            if (containerRef.current) {
                chart.resize(
                    containerRef.current.clientWidth,
                    containerRef.current.clientHeight,
                )
            }
        })
        ro.observe(containerRef.current)

        return () => {
            ro.disconnect()
            chart.remove()
            chartRef.current = null
            seriesRef.current = null
            aggregator.reset()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ── Subscribe to Zustand OUTSIDE React render cycle ───────────
    useEffect(() => {
        // Zustand subscribe with a selector — no re-renders
        const unsub = useGridStore.subscribe((state) => {
            if (!seriesRef.current) return

            const { completed, live } = aggregator.push(state.swapFee)

            if (completed) {
                seriesRef.current.update(completed as OhlcCandle)
            }
            seriesRef.current.update(live as OhlcCandle)
        })
        return unsub
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

            {/* Canvas mount point — lightweight-charts owns this div */}
            <div ref={containerRef} className="w-full h-full" />
        </div>
    )
}
