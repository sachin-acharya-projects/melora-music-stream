import { RecentlyPlayedCard } from "@/components/recently-played-card/recently-played-card"
import { useDragScroll } from "@/hooks/useDragScroll"
import { type ArtistSong } from "@/types"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Link } from "react-router-dom"

interface SongSectionProps {
    title: string
    subtitle?: string
    songs: ArtistSong[]
    isLoading?: boolean
    onPlay: (songs: ArtistSong[], index: number) => void
    viewAllHref?: string
}

export function SongSection({
    title,
    subtitle,
    songs,
    isLoading,
    onPlay,
    viewAllHref,
}: SongSectionProps) {
    const { ref: scrollRef, isDragging, handlers } = useDragScroll<HTMLDivElement>()

    if (!isLoading && songs.length === 0) return null

    const scrollBy = (dir: 1 | -1) => {
        scrollRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" })
    }

    return (
        <section className='mb-10'>
            <div className='mb-4 flex items-center justify-between'>
                <div>
                    <h2 className='text-lg font-bold dark:text-white'>{title}</h2>
                    {subtitle && (
                        <p className='mt-0.5 text-xs text-gray-500 dark:text-gray-400'>{subtitle}</p>
                    )}
                </div>
                <div className='flex items-center gap-4'>
                    {viewAllHref && (
                        <Link
                            to={viewAllHref}
                            className='flex h-8 cursor-pointer items-center text-sm leading-none font-medium text-red-600 transition-colors hover:text-red-700 dark:text-red-400'
                        >
                            View All
                        </Link>
                    )}
                    <div className='flex items-center gap-2'>
                        <button
                            onClick={() => scrollBy(-1)}
                            className='dark:bg-card flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border bg-white shadow-sm transition-colors hover:border-red-200 dark:border-white/10 dark:text-white'
                            title='Scroll left'
                        >
                            <ChevronLeft className='h-4 w-4' />
                        </button>
                        <button
                            onClick={() => scrollBy(1)}
                            className='dark:bg-card flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border bg-white shadow-sm transition-colors hover:border-red-200 dark:border-white/10 dark:text-white'
                            title='Scroll right'
                        >
                            <ChevronRight className='h-4 w-4' />
                        </button>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className='flex justify-center py-10'>
                    <Loader2 className='h-8 w-8 animate-spin text-red-600' />
                </div>
            ) : (
                <div
                    ref={scrollRef}
                    {...handlers}
                    className={`flex gap-5 overflow-x-auto px-1 py-2 ${
                        isDragging ? "cursor-grabbing select-none" : "cursor-grab"
                    }`}
                    style={{ scrollbarWidth: "none" }}
                >
                    {songs.map((song, index) => (
                        <div key={song.id} className='w-40 shrink-0'>
                            <RecentlyPlayedCard
                                song={song}
                                onClick={() => onPlay(songs, index)}
                                className='w-full'
                            />
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}
