import { useLyrics } from "@/hooks/useLyrics"
import { usePlayerStore } from "@/hooks/usePlayer"
import { cn } from "@/lib/utils"
import { type PlaylistItem } from "@/store/player/types"
import { Loader2, Music2 } from "lucide-react"
import { useEffect, useMemo, useRef } from "react"

const LAST_LINE_FALLBACK_SECONDS = 2.5
const CHARS_PER_SECOND = 16

export function LyricsPanel({ song }: { song: PlaylistItem }) {
    const lyricsQuery = useLyrics(song.id)
    const progress = usePlayerStore((s) => s.progress)
    const audioDuration = usePlayerStore((s) => s.duration)
    const seekTo = usePlayerStore((s) => s.seekTo)

    const containerRef = useRef<HTMLDivElement>(null)
    const activeLineRef = useRef<HTMLParagraphElement>(null)

    const lines = useMemo(() => lyricsQuery.data?.lines ?? [], [lyricsQuery.data])
    const synced = lyricsQuery.data?.synced ?? false

    const timedLines = useMemo(() => {
        if (synced) return lines
        const totalDuration = audioDuration || song.duration || 0
        if (lines.length === 0 || totalDuration <= 0) return []
        const totalChars = lines.reduce((acc, line) => acc + line.text.length, 0)
        if (totalChars === 0) return []
        let accumulated = 0
        return lines.map((line) => {
            const start = (accumulated / totalChars) * totalDuration
            accumulated += line.text.length
            return { ...line, time: start }
        })
    }, [lines, synced, audioDuration, song.duration])

    const activeIndex = useMemo(() => {
        let index = -1
        for (let i = 0; i < timedLines.length; i++) {
            const time = timedLines[i].time
            if (time === null) continue
            if (time <= progress) index = i
            else break
        }
        return index
    }, [timedLines, progress])

    useEffect(() => {
        if (activeLineRef.current && containerRef.current) {
            const container = containerRef.current
            const line = activeLineRef.current
            const scrollPos =
                line.offsetTop -
                container.offsetTop -
                container.clientHeight / 2 +
                line.clientHeight / 2
            container.scrollTo({ top: scrollPos, behavior: "smooth" })
        }
    }, [activeIndex])

    const renderWords = (text: string, lineTime: number, endTime: number) => {
        const words = text.split(" ")
        const totalChars = words.reduce((acc, word) => acc + word.length, 0)
        const lineDuration = Math.max(endTime - lineTime, 0.5)
        const speechDuration = totalChars / CHARS_PER_SECOND
        const wordWindow = Math.min(lineDuration, speechDuration)
        let accumulated = 0
        return words.map((word, index) => {
            const wordStart = lineTime + (accumulated / totalChars) * wordWindow
            accumulated += word.length + 1
            const isWordActive = progress >= wordStart
            return (
                <span key={index} className={cn(isWordActive && "font-bold text-red-500")}>
                    {word}
                    {index < words.length - 1 ? " " : ""}
                </span>
            )
        })
    }

    if (lyricsQuery.isLoading) {
        return (
            <div className='flex flex-col items-center gap-3 py-16'>
                <Loader2 className='h-8 w-8 animate-spin text-red-600' />
                <p className='text-sm text-gray-500 dark:text-gray-400'>Loading lyrics...</p>
            </div>
        )
    }

    if (lyricsQuery.isError || lines.length === 0) {
        return (
            <div className='flex flex-col items-center gap-2 py-16 text-center'>
                <Music2 className='h-8 w-8 text-gray-400' />
                <p className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                    No lyrics found
                </p>
                <p className='text-xs text-gray-400'>Lyrics couldn't be found for this track.</p>
            </div>
        )
    }

    return (
        <div className='flex flex-col gap-3'>
            <div className='flex items-center justify-between'>
                <p className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                    {synced ? "Synced lyrics" : "Lyrics · approximate sync"}
                </p>
                <p className='text-xs text-gray-400'>{song.uploader}</p>
            </div>

            <div
                ref={containerRef}
                className='flex max-h-[55vh] scrollbar-thin scrollbar-thumb-gray-200 flex-col gap-3 overflow-y-auto px-1 py-2 dark:scrollbar-thumb-white/10'
            >
                {timedLines.map((line, index) => {
                    const isActive = index === activeIndex
                    const lineTime = line.time ?? 0
                    const nextTime =
                        index + 1 < timedLines.length ? timedLines[index + 1].time : null
                    const lineEnd =
                        nextTime ?? Math.max(lineTime + LAST_LINE_FALLBACK_SECONDS, lineTime + 0.5)
                    const seekable = line.time !== null
                    return (
                        <p
                            key={`${index}-${line.text}`}
                            ref={isActive ? activeLineRef : null}
                            onClick={() => {
                                if (line.time !== null) seekTo(line.time)
                            }}
                            className={cn(
                                "text-base leading-relaxed transition-colors duration-300",
                                isActive
                                    ? "font-medium text-gray-700 dark:text-gray-100"
                                    : seekable
                                      ? "cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                      : "text-gray-500 dark:text-gray-400",
                            )}
                        >
                            {isActive ? renderWords(line.text, lineTime, lineEnd) : line.text}
                        </p>
                    )
                })}
            </div>
        </div>
    )
}
