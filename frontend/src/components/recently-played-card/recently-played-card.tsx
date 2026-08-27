import { cn, formatDuration } from "@/lib/utils"
import { SongThumb } from "@/components/song-thumb/song-thumb"
import { type ArtistSong } from "@/types"
import { Play } from "lucide-react"

interface RecentlyPlayedCardProps {
    song: ArtistSong
    onClick: () => void
    className?: string
}

export function RecentlyPlayedCard({ song, onClick, className }: RecentlyPlayedCardProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "dark:bg-card group w-40 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-red-300 dark:border-white/10",
                className,
            )}
        >
            <div className='relative aspect-video w-full overflow-hidden'>
                <SongThumb song={song} />
                <div className='absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100'>
                    <span className='flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white shadow-lg'>
                        <Play className='h-4 w-4 translate-x-0.5 fill-current' />
                    </span>
                </div>
                <span className='absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 text-xs text-white'>
                    {formatDuration(song.duration)}
                </span>
            </div>
            <div className='p-2.5'>
                <h3 className='line-clamp-2 text-xs font-semibold dark:text-white'>
                    {song.title || "Unknown Title"}
                </h3>
                <p className='mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400'>
                    {song.uploader || "Unknown Artist"}
                </p>
            </div>
        </div>
    )
}
