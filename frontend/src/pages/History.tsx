import { useHistory } from "@/hooks/useHistory"
import { usePlayerStore } from "@/hooks/usePlayer"
import { useTitle } from "@/hooks/useTitle"
import { formatDuration } from "@/lib/utils"
import { apiService } from "@/services/api.service"
import { type HistoryItem, type Song } from "@/types"
import {
    ChevronLeft,
    ChevronRight,
    Download,
    History as HistoryIcon,
    ListMusic,
    Loader2,
    Play,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "react-toastify"
import { MESSAGES } from "@/utils/messages"

const ITEMS_PER_PAGE = 20

const toSong = (item: HistoryItem): Song | null =>
    item.song
        ? {
              id: item.song.id,
              title: item.song.title ?? "",
              uploader: item.song.uploader ?? "",
              thumbnail: item.song.thumbnail ?? "",
              duration: item.song.duration ?? 0,
              created_at: item.played_at ?? "",
          }
        : null

const formatDate = (iso: string | null) => {
    if (!iso) return "Unknown"
    const d = new Date(iso)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return "Today"
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

const formatTime = (iso: string | null) => {
    if (!iso) return ""
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

export default function History() {
    useTitle("Listening History")
    const [page, setPage] = useState(1)
    const [filter, setFilter] = useState("")
    const setPlaylist = usePlayerStore((s) => s.setPlaylist)
    const addToNowPlaying = usePlayerStore((s) => s.addToQueue)

    const { data, isLoading } = useHistory({ page, page_size: ITEMS_PER_PAGE })
    const items = useMemo(() => data?.items ?? [], [data?.items])
    const total = data?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

    const grouped = useMemo(() => {
        const filtered = filter
            ? items.filter(
                  (item) =>
                      item.song?.title?.toLowerCase().includes(filter.toLowerCase()) ||
                      item.song?.uploader?.toLowerCase().includes(filter.toLowerCase()),
              )
            : items
        const map = new Map<string, HistoryItem[]>()
        for (const item of filtered) {
            const day = item.played_at ? formatDate(item.played_at) : "Unknown"
            if (!map.has(day)) map.set(day, [])
            map.get(day)?.push(item)
        }
        return [...map.entries()]
    }, [items, filter])

    const handlePlay = (index: number) => {
        const songs = items.map(toSong).filter((s): s is Song => s !== null)
        if (songs.length > 0) {
            setPlaylist(songs, index, "history")
        }
    }

    if (isLoading && items.length === 0) {
        return (
            <div className='flex justify-center pt-20'>
                <Loader2 className='h-12 w-12 animate-spin text-red-600' />
            </div>
        )
    }

    return (
        <div className='mx-auto w-full max-w-375 px-4 pt-4 pb-40'>
            <div className='mb-8 flex flex-wrap items-end justify-between gap-4'>
                <div>
                    <h1 className='text-3xl font-bold dark:text-white'>
                        Listening <span className='text-red-500'>History</span>
                    </h1>
                    <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                        Every song you've listened to, in one place
                    </p>
                </div>
                <div className='relative'>
                    <input
                        type='text'
                        value={filter}
                        onChange={(e) => {
                            setFilter(e.target.value)
                            setPage(1)
                        }}
                        placeholder='Search history...'
                        className='dark:bg-card h-11 w-56 rounded-xl border bg-white px-4 text-sm shadow-sm transition-all focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
                    />
                </div>
            </div>

            {items.length === 0 ? (
                <div className='flex flex-col items-center gap-6 py-16 text-center'>
                    <span className='flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                        <HistoryIcon className='h-9 w-9 text-red-500' />
                    </span>
                    <div className='flex flex-col gap-1'>
                        <h2 className='text-lg font-semibold dark:text-white'>No history yet</h2>
                        <p className='text-sm text-gray-500 dark:text-gray-400'>
                            Songs you play will show up here automatically.
                        </p>
                    </div>
                </div>
            ) : grouped.length === 0 ? (
                <p className='py-12 text-center text-sm text-gray-400'>
                    Nothing matched "{filter}".
                </p>
            ) : (
                <div className='flex flex-col gap-6'>
                    {grouped.map(([day, dayItems]) => (
                        <div key={day}>
                            <h2 className='mb-2 text-sm font-bold text-gray-500 uppercase dark:text-gray-400'>
                                {day}
                            </h2>
                            <div className='flex flex-col gap-2'>
                                {dayItems.map((item) => {
                                    const song = toSong(item)
                                    if (!song) return null
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => handlePlay(items.indexOf(item))}
                                            className='dark:bg-card group flex cursor-pointer items-center gap-4 rounded-xl border border-gray-100 bg-white p-2 transition-all hover:border-red-200 dark:border-white/10'
                                        >
                                            <div className='relative h-14 w-24 shrink-0 overflow-hidden rounded-lg'>
                                                <img
                                                    src={song.thumbnail}
                                                    alt={song.title}
                                                    loading='lazy'
                                                    decoding='async'
                                                    referrerPolicy='no-referrer'
                                                    className='h-full w-full object-cover'
                                                />
                                                <div className='absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100'>
                                                    <Play className='h-4 w-4 translate-x-0.5 fill-current text-white' />
                                                </div>
                                            </div>
                                            <div className='min-w-0 flex-1'>
                                                <h3 className='truncate text-sm font-semibold dark:text-white'>
                                                    {song.title || "Unknown Title"}
                                                </h3>
                                                <p className='truncate text-xs text-gray-500 dark:text-gray-400'>
                                                    {song.uploader || "Unknown Artist"}
                                                </p>
                                            </div>
                                            <div className='flex shrink-0 items-center gap-3 pr-2'>
                                                <span className='text-xs text-gray-400'>
                                                    {item.played_at
                                                        ? formatTime(item.played_at)
                                                        : ""}
                                                </span>
                                                <span className='w-12 text-right text-xs font-medium text-gray-400'>
                                                    {formatDuration(song.duration)}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        addToNowPlaying(song)
                                                        toast.success(MESSAGES.QUEUE_ADDED)
                                                    }}
                                                    className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-black/5 hover:text-red-500 dark:hover:bg-white/5'
                                                    title='Add to Queue'
                                                >
                                                    <ListMusic className='h-4 w-4' />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        window.open(
                                                            apiService.getDownloadUrl(song.id),
                                                            "_blank",
                                                        )
                                                    }}
                                                    className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-black/5 hover:text-red-500 dark:hover:bg-white/5'
                                                    title='Download'
                                                >
                                                    <Download className='h-4 w-4' />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className='mt-8 flex items-center justify-center gap-4'>
                    <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className='dark:bg-card flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border bg-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-white'
                    >
                        <ChevronLeft className='h-5 w-5' />
                    </button>
                    <span className='text-sm font-medium text-gray-500'>
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className='dark:bg-card flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border bg-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-white'
                    >
                        <ChevronRight className='h-5 w-5' />
                    </button>
                </div>
            )}
        </div>
    )
}
