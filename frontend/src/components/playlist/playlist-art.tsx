import { ImageWithFallback } from "@/components/ui/image-with-fallback/image-with-fallback"
import { type Playlist } from "@/types"
import { ListMusic } from "lucide-react"

const FallbackIcon = ({ className = "h-10 w-10 text-red-500" }: { className?: string }) => (
    <ListMusic className={className} />
)

export function PlaylistArt({
    playlist,
    className,
    iconClassName,
}: {
    playlist: Playlist
    className?: string
    iconClassName?: string
}) {
    const thumbs = (
        (playlist.thumbnails?.length
            ? playlist.thumbnails
            : (playlist.songs ?? []).map((song) => song.thumbnail).filter(Boolean))
    ).filter((thumbnail): thumbnail is string => Boolean(thumbnail)).slice(0, 4)

    const fallback = <FallbackIcon className={iconClassName ?? "h-10 w-10 text-red-500"} />

    return (
        <div className={`relative overflow-hidden ${className ?? ""}`}>
            {playlist.cover_image_url ? (
                <ImageWithFallback
                    src={playlist.cover_image_url}
                    alt={playlist.name}
                    className='h-full w-full object-cover'
                    fallback={fallback}
                />
            ) : thumbs.length === 0 ? (
                <div
                    role='img'
                    aria-label={playlist.name}
                    className='flex h-full w-full items-center justify-center bg-gradient-to-br from-red-500/20 to-red-600/40'
                >
                    {fallback}
                </div>
            ) : thumbs.length === 1 ? (
                <ImageWithFallback
                    src={thumbs[0]}
                    alt={playlist.name}
                    className='h-full w-full object-cover'
                    fallback={fallback}
                />
            ) : (
                <div className='grid h-full w-full grid-cols-2 grid-rows-2'>
                    {Array.from({ length: 4 }, (_, index) => (
                        <ImageWithFallback
                            key={index}
                            src={thumbs[index] ?? null}
                            alt={thumbs[index] ? `${playlist.name} artwork ${index + 1}` : playlist.name}
                            className='h-full w-full object-cover'
                            fallback={<FallbackIcon className='h-6 w-6 text-red-500' />}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
