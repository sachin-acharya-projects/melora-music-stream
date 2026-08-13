import { usePlayerStore } from "@/hooks/usePlayer"
import { useThemeStore } from "@/hooks/useTheme"
import { formatDuration } from "@/lib/utils"
import { apiService } from "@/services/api.service"
import { SongThumb } from "@/components/song-thumb/song-thumb"
import { type ArtistSong } from "@/types"
import SortSelect, { type SortSelectOption } from "@/components/ui/sort-select/sort-select"
import ViewToggle from "@/components/ui/view-toggle/view-toggle"
import { MESSAGES } from "@/utils/messages"
import {
    ChevronLeft,
    ChevronRight,
    Download,
    LayoutList,
    ListMusic,
    Loader2,
    Play,
    Search,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "react-toastify"

const ITEMS_PER_PAGE = 10

const SONG_SORT_OPTIONS: SortSelectOption[] = [
    { value: "title:asc", label: "Title A–Z" },
    { value: "title:desc", label: "Title Z–A" },
    { value: "uploader:asc", label: "Artist A–Z" },
    { value: "uploader:desc", label: "Artist Z–A" },
    { value: "duration:asc", label: "Duration ↑" },
    { value: "duration:desc", label: "Duration ↓" },
    { value: "created_at:desc", label: "Recently added" },
]

interface SongBrowserProps {
    songs: ArtistSong[]
    isLoading?: boolean
    onPlay: (songs: ArtistSong[], index: number) => void
}

type SongSortField = "title" | "uploader" | "duration" | "created_at"

const toPlayable = (songs: ArtistSong[]) =>
    songs.map((s) => ({ ...s, created_at: s.created_at ?? "" }))

export function SongBrowser({ songs, isLoading, onPlay }: SongBrowserProps) {
    const { viewMode, setViewMode } = useThemeStore()
    const addToNowPlaying = usePlayerStore((s) => s.addToQueue)
    const [search, setSearch] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [sort, setSort] = useState("title:asc")
    const [isPaginated, setIsPaginated] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 250)
        return () => clearTimeout(timer)
    }, [search])

    const [sortBy, sortOrder] = sort.split(":") as [SongSortField, "asc" | "desc"]

    const filtered = useMemo(() => {
        const term = debouncedSearch.trim().toLowerCase()
        const base = term
            ? songs.filter(
                  (song) =>
                      (song.title || "").toLowerCase().includes(term) ||
                      (song.uploader || "").toLowerCase().includes(term),
              )
            : songs
        return [...base].sort((a, b) => {
            const av =
                sortBy === "duration"
                    ? a.duration
                    : sortBy === "created_at"
                      ? (a.created_at ?? "")
                      : (a[sortBy] ?? "").toLowerCase()
            const bv =
                sortBy === "duration"
                    ? b.duration
                    : sortBy === "created_at"
                      ? (b.created_at ?? "")
                      : (b[sortBy] ?? "").toLowerCase()
            const cmp = av < bv ? -1 : av > bv ? 1 : 0
            return sortOrder === "asc" ? cmp : -cmp
        })
    }, [songs, debouncedSearch, sortBy, sortOrder])

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
    const safePage = Math.min(currentPage, totalPages)
    const visible = isPaginated
        ? filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
        : filtered

    const handlePlay = (index: number) => {
        onPlay(filtered, index)
    }

    const handleAddToQueue = (song: ArtistSong) => {
        addToNowPlaying(toPlayable([song])[0])
        toast.success(MESSAGES.QUEUE_ADDED)
    }

    return (
        <div>
            <div className='mb-5 flex flex-wrap items-center justify-between gap-4'>
                <div className='relative'>
                    <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400' />
                    <input
                        type='text'
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value)
                            setCurrentPage(1)
                        }}
                        placeholder='Search songs...'
                        className='dark:bg-card h-11 w-64 rounded-xl border bg-white pr-4 pl-10 text-sm shadow-sm transition-all focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
                    />
                </div>

                <div className='flex items-center gap-3'>
                    <SortSelect
                        value={sort}
                        onChange={(value) => {
                            setSort(value)
                            setCurrentPage(1)
                        }}
                        options={SONG_SORT_OPTIONS}
                    />
                    <button
                        onClick={() => {
                            setIsPaginated(!isPaginated)
                            setCurrentPage(1)
                        }}
                        className={`flex h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-medium shadow-sm transition-all ${
                            !isPaginated
                                ? "border-red-500 bg-red-500 text-white dark:bg-red-600"
                                : "dark:bg-card border-gray-200 bg-white text-gray-700 hover:border-red-200 dark:border-white/10 dark:text-white"
                        }`}
                        title={
                            isPaginated
                                ? "Disable pagination to view all songs"
                                : "Enable pagination"
                        }
                    >
                        <LayoutList className='h-4 w-4' />
                        <span>{isPaginated ? "Paginated" : "Show All"}</span>
                    </button>
                    <ViewToggle view={viewMode} onChange={setViewMode} />
                </div>
            </div>

            {isLoading ? (
                <div className='flex justify-center pt-12'>
                    <Loader2 className='h-10 w-10 animate-spin text-red-600' />
                </div>
            ) : filtered.length === 0 ? (
                <div className='flex flex-col items-center gap-4 py-12 text-center'>
                    <span className='flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                        <ListMusic className='h-9 w-9 text-red-500' />
                    </span>
                    <h2 className='text-lg font-semibold dark:text-white'>
                        {search ? "No songs found" : "No songs yet"}
                    </h2>
                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                        {search
                            ? `Nothing matched "${search}". Try a different search.`
                            : "Songs will appear here once available."}
                    </p>
                </div>
            ) : (
                <>
                    <div
                        className={
                            viewMode === "grid"
                                ? "grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                                : "flex flex-col gap-2"
                        }
                    >
                        {visible.map((song) => {
                            const globalIndex = filtered.indexOf(song)
                            return viewMode === "grid" ? (
                                <div
                                    key={song.id}
                                    className='dark:bg-card group relative cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-red-300 dark:border-white/10'
                                    onClick={() => handlePlay(globalIndex)}
                                >
                                    <div className='relative aspect-video w-full overflow-hidden'>
                                        <SongThumb song={song} />
                                        <div className='absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handlePlay(globalIndex)
                                                }}
                                                className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform hover:scale-110'
                                                title='Play Now'
                                            >
                                                <Play className='h-5 w-5 translate-x-0.5 fill-current' />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleAddToQueue(song)
                                                }}
                                                className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white shadow-lg backdrop-blur-md transition-transform hover:scale-110'
                                                title='Add to Queue'
                                            >
                                                <ListMusic className='h-5 w-5' />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    window.open(
                                                        apiService.getDownloadUrl(song.id),
                                                        "_blank",
                                                    )
                                                }}
                                                className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white shadow-lg backdrop-blur-md transition-transform hover:scale-110'
                                                title='Download MP3'
                                            >
                                                <Download className='h-5 w-5' />
                                            </button>
                                        </div>
                                        <span className='absolute right-2 bottom-2 rounded bg-black/80 px-2 py-1 text-xs text-white'>
                                            {formatDuration(song.duration)}
                                        </span>
                                    </div>
                                    <div className='p-3'>
                                        <h3 className='line-clamp-2 text-sm font-semibold dark:text-white'>
                                            {song.title || "Unknown Title"}
                                        </h3>
                                        <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                                            {song.uploader || "Unknown Artist"}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    key={song.id}
                                    onClick={() => handlePlay(globalIndex)}
                                    className='group dark:bg-card flex cursor-pointer items-center gap-4 rounded-xl border border-gray-100 bg-white p-2 transition-all hover:border-red-200 dark:border-white/10'
                                >
                                    <div className='relative h-14 w-24 shrink-0 overflow-hidden rounded-lg'>
                                        <SongThumb song={song} />
                                        <div className='absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handlePlay(globalIndex)
                                                }}
                                                className='cursor-pointer rounded-full bg-red-600 p-1.5 text-white shadow-lg'
                                            >
                                                <Play className='h-4 w-4 translate-x-0.5 fill-current' />
                                            </button>
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
                                    <div className='flex items-center gap-2 pr-2'>
                                        <span className='mr-2 text-xs font-medium text-gray-400'>
                                            {formatDuration(song.duration)}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleAddToQueue(song)
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

                    {isPaginated && totalPages > 1 && (
                        <div className='mt-8 flex items-center justify-center gap-4'>
                            <button
                                onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                                disabled={safePage === 1}
                                className='dark:bg-card flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border bg-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-white'
                            >
                                <ChevronLeft className='h-5 w-5' />
                            </button>
                            <span className='text-sm font-medium text-gray-500'>
                                Page {safePage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                                disabled={safePage === totalPages}
                                className='dark:bg-card flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border bg-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-white'
                            >
                                <ChevronRight className='h-5 w-5' />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
