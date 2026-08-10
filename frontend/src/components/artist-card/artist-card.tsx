import { type Artist } from "@/types"
import { formatCount } from "@/lib/utils"
import { Download, Heart, Loader2, Youtube } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface ArtistCardProps {
    artist: Artist
    onFollow?: (artist: Artist) => void
    isFollowing?: boolean
    onImport?: (artist: Artist) => void
    isImporting?: boolean
}

export function ArtistCard({
    artist,
    onFollow,
    isFollowing,
    onImport,
    isImporting,
}: ArtistCardProps) {
    const navigate = useNavigate()

    const openArtist = () => {
        if (isImporting) return
        if (artist.is_external) {
            onImport?.(artist)
            return
        }
        navigate(`/artists/${artist.slug}`)
    }

    return (
        <div
            onClick={openArtist}
            className='dark:bg-card group relative cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-red-300 hover:shadow-lg dark:border-white/10'
        >
            <div className='relative mx-auto aspect-square w-full overflow-hidden rounded-full'>
                {artist.thumbnail_url ? (
                    <img
                        src={artist.thumbnail_url}
                        alt={artist.name}
                        loading='lazy'
                        decoding='async'
                        referrerPolicy='no-referrer'
                        className='h-full w-full object-cover'
                    />
                ) : (
                    <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-red-400 to-red-600'>
                        <span className='text-4xl font-bold text-white'>
                            {artist.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
                <div className='absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20' />
            </div>
            {artist.is_from_youtube && (
                <span
                    className='absolute top-2 left-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 shadow-md'
                    title='YouTube artist'
                >
                    <Youtube className='h-3.5 w-3.5 text-white' />
                </span>
            )}

            <h3 className='mt-3 truncate text-sm font-semibold capitalize dark:text-white'>
                {artist.name}
            </h3>
            {artist.reason && (
                <p className='mt-1 inline-block max-w-full truncate rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-950 dark:text-red-400'>
                    {artist.reason}
                </p>
            )}
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                {artist.play_count != null
                    ? `${artist.play_count} ${artist.play_count === 1 ? "play" : "plays"}`
                    : artist.subscribers != null
                      ? `${formatCount(artist.subscribers)} subscribers`
                      : `${artist.follower_count.toLocaleString()} ${
                            artist.follower_count === 1 ? "follower" : "followers"
                        }`}
            </p>
            {artist.subscribers != null && (
                <p className='mt-0.5 text-[11px] text-gray-400 dark:text-gray-500'>
                    {artist.follower_count.toLocaleString()}{" "}
                    {artist.follower_count === 1 ? "follower" : "followers"}
                </p>
            )}

            {artist.is_external && onImport && (
                <span className='mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-600 dark:bg-red-950 dark:text-red-400'>
                    {isImporting ? (
                        <Loader2 className='h-3 w-3 animate-spin' />
                    ) : (
                        <Download className='h-3 w-3' />
                    )}
                    {isImporting ? "Importing..." : "Click to import"}
                </span>
            )}

            {onFollow && !artist.is_external && (
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onFollow(artist)
                    }}
                    disabled={isFollowing}
                    className={`absolute top-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border shadow-lg backdrop-blur-sm transition-all hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60 ${
                        artist.is_following
                            ? "border-red-500 bg-red-600 text-white"
                            : "border-white/40 bg-black/40 text-white"
                    }`}
                    title={artist.is_following ? "Unfollow" : "Follow"}
                >
                    {isFollowing ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                        <Heart className={`h-4 w-4 ${artist.is_following ? "fill-current" : ""}`} />
                    )}
                </button>
            )}
        </div>
    )
}
