import { useRef, useState, type MouseEvent } from "react"
import { type DayPlays } from "@/types"

interface ListeningChartProps {
    data: DayPlays[]
    maxBars?: number
}

const VIEWBOX_WIDTH = 800
const VIEWBOX_HEIGHT = 220
const PADDING = { top: 14, right: 14, bottom: 10, left: 14 }

export function ListeningChart({ data, maxBars = 30 }: ListeningChartProps) {
    const bars = data.slice(-maxBars)
    const wrapRef = useRef<HTMLDivElement>(null)
    const [hover, setHover] = useState<{ index: number } | null>(null)

    if (bars.length === 0) {
        return (
            <p className='py-10 text-center text-sm text-gray-400'>
                No listening activity in the last 30 days yet.
            </p>
        )
    }

    const maxPlays = Math.max(1, ...bars.map((b) => b.plays))
    const totalPlays = bars.reduce((sum, b) => sum + b.plays, 0)

    const plotWidth = VIEWBOX_WIDTH - PADDING.left - PADDING.right
    const plotHeight = VIEWBOX_HEIGHT - PADDING.top - PADDING.bottom
    const baselineY = PADDING.top + plotHeight
    const step = bars.length > 1 ? plotWidth / (bars.length - 1) : 0

    const points = bars.map((bar, index) => ({
        bar,
        x: PADDING.left + index * step,
        y: PADDING.top + plotHeight - (bar.plays / maxPlays) * plotHeight,
    }))

    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`

    const hovered = hover ? points[hover.index] : null
    const labelStep = Math.max(1, Math.ceil(points.length / 6))
    const xPct = (x: number) => (x / VIEWBOX_WIDTH) * 100
    const yPct = (y: number) => (y / VIEWBOX_HEIGHT) * 100

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        const rect = wrapRef.current?.getBoundingClientRect()
        if (!rect) return
        const relX = ((e.clientX - rect.left) / rect.width) * VIEWBOX_WIDTH
        let index: number
        if (points.length === 1) {
            index = 0
        } else {
            index = Math.min(
                points.length - 1,
                Math.max(0, Math.round((relX - PADDING.left) / step)),
            )
        }
        setHover((prev) => (prev?.index === index ? prev : { index }))
    }

    return (
        <div>
            <div
                ref={wrapRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHover(null)}
                className='relative'
            >
                <svg
                    viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
                    className='h-44 w-full'
                    preserveAspectRatio='none'
                    aria-hidden='true'
                >
                    <defs>
                        <linearGradient id='listening-area' x1='0' y1='0' x2='0' y2='1'>
                            <stop offset='0%' stopColor='#ef4444' stopOpacity='0.35' />
                            <stop offset='100%' stopColor='#ef4444' stopOpacity='0.02' />
                        </linearGradient>
                    </defs>
                    <path d={areaPath} fill='url(#listening-area)' />
                    <path
                        d={linePath}
                        fill='none'
                        stroke='#ef4444'
                        strokeWidth={2}
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        vectorEffect='non-scaling-stroke'
                    />
                    {hovered && (
                        <line
                            x1={hovered.x}
                            y1={PADDING.top}
                            x2={hovered.x}
                            y2={baselineY}
                            stroke='#9ca3af'
                            strokeWidth={1}
                            strokeDasharray='3 3'
                            vectorEffect='non-scaling-stroke'
                        />
                    )}
                </svg>

                <span className='pointer-events-none absolute top-0 left-0 text-[10px] font-medium text-gray-400 dark:text-gray-500'>
                    Peak: {maxPlays} plays
                </span>

                {hovered && (
                    <>
                        <span
                            className='pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 ring-2 ring-white dark:ring-black'
                            style={{ left: `${xPct(hovered.x)}%`, top: `${yPct(hovered.y)}%` }}
                        />
                        <div
                            className='pointer-events-none absolute z-10 rounded-md bg-black px-2 py-1 text-xs whitespace-nowrap text-white'
                            style={{
                                left: `${Math.min(88, Math.max(12, xPct(hovered.x)))}%`,
                                top: `${Math.max(16, yPct(hovered.y))}%`,
                                transform: "translate(-50%, -130%)",
                            }}
                        >
                            {hovered.bar.date}: {hovered.bar.plays}{" "}
                            {hovered.bar.plays === 1 ? "play" : "plays"}
                        </div>
                    </>
                )}

                {points.map((p, index) =>
                    index % labelStep === 0 ? (
                        <span
                            key={p.bar.date}
                            className='pointer-events-none absolute bottom-0 -translate-x-1/2 text-[9px] text-gray-400'
                            style={{ left: `${xPct(p.x)}%` }}
                        >
                            {p.bar.date.slice(5)}
                        </span>
                    ) : null,
                )}
            </div>

            <div className='mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400'>
                <span>Plays per day</span>
                <span>{totalPlays} plays total</span>
            </div>
        </div>
    )
}
