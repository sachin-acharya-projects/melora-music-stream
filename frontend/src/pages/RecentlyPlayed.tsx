import { RecentlyPlayedCard } from "@/components/recently-played-card/recently-played-card"
import { usePlayerStore } from "@/hooks/usePlayer"
import { useRecentlyPlayed } from "@/hooks/useHistory"
import { useTitle } from "@/hooks/useTitle"
import { type ArtistSong, type HistoryItem, type Song } from "@/types"
import { ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react"
import { useState } from "react"

const ITEMS_PER_PAGE = 50

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

export default function RecentlyPlayed() {
    useTitle("Recently played")
    const [page, setPage] = useState(1)
    const setPlaylist = usePlayerStore((s) => s.setPlaylist)

    const { data, isLoading } = useRecentlyPlayed({ page, page_size: ITEMS_PER_PAGE })
    const items = data?.items ?? []
    const total = data?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

    const handlePlay = (index: number) => {
        const songs = items.map(toSong).filter((s): s is Song => s !== null)
        if (songs.length > 0) {
            setPlaylist(songs, index, "recently-played")
        }
    }

    return (
        <div className='mx-auto w-full max-w-375 px-4 pt-4 pb-40'>
            <div className='mb-8'>
                <h1 className='text-3xl font-bold dark:text-white'>
                    Recently played <span className='text-red-500'>by you</span>
                </h1>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                    {total} unique {total === 1 ? "song" : "songs"} you've listened to
                </p>
            </div>

            {isLoading && items.length === 0 ? (
                <div className='flex justify-center pt-20'>
                    <Loader2 className='h-12 w-12 animate-spin text-red-600' />
                </div>
            ) : items.length === 0 ? (
                <div className='flex flex-col items-center gap-4 py-16 text-center'>
                    <span className='flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                        <Clock className='h-9 w-9 text-red-500' />
                    </span>
                    <h2 className='text-lg font-semibold dark:text-white'>Nothing played yet</h2>
                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                        Songs you listen to will show up here.
                    </p>
                </div>
            ) : (
                <div className='grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
                    {items.map((item, index) => {
                        const song = toSong(item)
                        if (!song) return null
                        return (
                            <RecentlyPlayedCard
                                key={item.id}
                                song={song as ArtistSong}
                                onClick={() => handlePlay(index)}
                                className='w-full'
                            />
                        )
                    })}
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
