import { type Playlist } from "@/types"
import { ListMusic } from "lucide-react"

export function PlaylistArt({
    playlist,
    className,
    iconClassName,
}: {
    playlist: Playlist
    className?: string
    iconClassName?: string
}) {
    const thumbs =
        playlist.thumbnails ??
        (playlist.songs ?? []).map((s) => s.thumbnail).filter((t): t is string => Boolean(t))
    const count = thumbs.length

    if (count === 0 || (count === 1 && !thumbs[0])) {
        return (
            <div
                className={`flex items-center justify-center bg-gradient-to-br from-red-500/20 to-red-600/40 ${className}`}
            >
                <ListMusic className={iconClassName ?? "h-10 w-10 text-red-500"} />
            </div>
        )
    }

    if (count === 1) {
        return (
            <img
                src={thumbs[0]}
                alt=''
                className={`h-full w-full object-cover ${className}`}
                draggable={false}
                referrerPolicy='no-referrer'
            />
        )
    }

    if (count === 2) {
        return (
            <div className={`grid grid-cols-2 ${className}`}>
                {thumbs.slice(0, 2).map((thumb, i) => (
                    <img
                        key={i}
                        src={thumb}
                        alt=''
                        className='h-full w-full object-cover'
                        draggable={false}
                        loading='lazy'
                        decoding='async'
                        referrerPolicy='no-referrer'
                    />
                ))}
            </div>
        )
    }

    return (
        <div className={`grid grid-cols-2 grid-rows-2 ${className}`}>
            {thumbs.slice(0, 4).map((thumb, i) =>
                thumb ? (
                    <img
                        key={i}
                        src={thumb}
                        alt=''
                        className='h-full w-full object-cover'
                        draggable={false}
                        loading='lazy'
                        decoding='async'
                        referrerPolicy='no-referrer'
                    />
                ) : (
                    <div key={i} className='h-full w-full bg-gray-200 dark:bg-white/10' />
                ),
            )}
            {count === 3 && (
                <div className='flex items-center justify-center bg-gradient-to-br from-red-500/20 to-red-600/40'>
                    <ListMusic className='h-6 w-6 text-red-500' />
                </div>
            )}
        </div>
    )
}
