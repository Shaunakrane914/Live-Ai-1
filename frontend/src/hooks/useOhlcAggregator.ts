/**
 * useOhlcAggregator
 * ─────────────────
 * Time-bucketing engine that converts 500ms simulation ticks into OHLC candles.
 *
 * Architecture (as described in theory):
 *   - BUCKET_MS = 3000 ms  (6 ticks per candle)
 *   - Each candle: { time, open, high, low, close }
 *   - time is "candle start" in Unix seconds (required by lightweight-charts)
 *   - The current (incomplete) candle is exposed as `liveCandleRef` so the
 *     chart can update imperatively without triggering React re-renders.
 */

import { useRef, useCallback } from 'react'
import type { CandlestickData, Time } from 'lightweight-charts'

export const BUCKET_MS = 3_000   // 3 s = 6 ticks @ 500ms

export interface OhlcCandle extends CandlestickData {
    time: Time   // Unix seconds (integer)
}

interface Bucket {
    time: number   // bucket start epoch ms
    open: number
    high: number
    low: number
    close: number
}

/** Return value of useOhlcAggregator */
export interface OhlcAggregator {
    /** Feed one price value (called by the chart component via Zustand subscribe) */
    push: (priceValue: number) => { completed: OhlcCandle | null; live: OhlcCandle }
    /** Reset state (e.g. on reconnect) */
    reset: () => void
}

export function useOhlcAggregator(): OhlcAggregator {
    const bucketRef = useRef<Bucket | null>(null)

    const reset = useCallback(() => {
        bucketRef.current = null
    }, [])

    const push = useCallback((value: number): { completed: OhlcCandle | null; live: OhlcCandle } => {
        const now = Date.now()
        const bucketTs = Math.floor(now / BUCKET_MS) * BUCKET_MS   // snap to bucket boundary

        let completed: OhlcCandle | null = null

        if (!bucketRef.current || bucketRef.current.time !== bucketTs) {
            // ── New bucket starting ──────────────────────────────
            if (bucketRef.current) {
                // Flush the completed candle before we start a new one
                const b = bucketRef.current
                completed = {
                    time: Math.floor(b.time / 1000) as Time,
                    open: b.open,
                    high: b.high,
                    low: b.low,
                    close: b.close,
                }
            }
            bucketRef.current = { time: bucketTs, open: value, high: value, low: value, close: value }
        } else {
            // ── Update current bucket ────────────────────────────
            const b = bucketRef.current
            if (value > b.high) b.high = value
            if (value < b.low) b.low = value
            b.close = value
        }

        // Always expose the live (incomplete) candle for real-time update
        const b = bucketRef.current!
        const live: OhlcCandle = {
            time: Math.floor(b.time / 1000) as Time,
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
        }

        return { completed, live }
    }, [])

    return { push, reset }
}
