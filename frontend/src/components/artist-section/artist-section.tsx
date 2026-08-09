import { type Artist } from "@/types"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { ArtistCard } from "../artist-card/artist-card"
import { useDragScroll } from "@/hooks/useDragScroll"

interface ArtistSectionProps {
    title: string
    artists: Artist[]
    onFollow?: (artist: Artist) => void
    isFollowing?: boolean
    onImport?: (artist: Artist) => void
    importingId?: string | null
    viewAllHref?: string
}

export function ArtistSection({
    title,
    artists,
    onFollow,
    isFollowing,
    onImport,
    importingId,
    viewAllHref,
}: ArtistSectionProps) {
    const { ref: scrollRef, isDragging, handlers } = useDragScroll<HTMLDivElement>()

    const scrollBy = (dir: 1 | -1) => {
        scrollRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" })
    }

    if (artists.length === 0) return null

    return (
        <section className='mb-10'>
            <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-lg font-bold dark:text-white'>{title}</h2>
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
            <div
                ref={scrollRef}
                {...handlers}
                className={`flex gap-5 overflow-x-auto px-1 py-2 ${
                    isDragging ? "cursor-grabbing select-none" : "cursor-grab"
                }`}
                style={{ scrollbarWidth: "none" }}
            >
                {artists.map((artist) => (
                    <div key={artist.id} className='w-40 shrink-0 sm:w-44'>
                        <ArtistCard
                            artist={artist}
                            onFollow={onFollow}
                            isFollowing={isFollowing}
                            onImport={onImport}
                            isImporting={importingId === artist.id}
                        />
                    </div>
                ))}
            </div>
        </section>
    )
}
