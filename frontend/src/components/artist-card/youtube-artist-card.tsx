import { formatCount } from "@/lib/utils"
import { type YouTubeArtist } from "@/types"
import { Check, Loader2, Play, Youtube } from "lucide-react"

interface YouTubeArtistCardProps {
    artist: YouTubeArtist
    isImporting?: boolean
    onOpen: (artist: YouTubeArtist) => void
}

export function YouTubeArtistCard({ artist, isImporting, onOpen }: YouTubeArtistCardProps) {
    return (
        <div
            onClick={() => onOpen(artist)}
            className='dark:bg-card group relative cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-red-300 hover:shadow-lg dark:border-white/10'
        >
            <div className='relative mx-auto aspect-square w-full overflow-hidden rounded-full'>
                {artist.thumbnail ? (
                    <img
                        src={artist.thumbnail}
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
                <span
                    className='absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 shadow-md'
                    title='YouTube artist'
                >
                    <Youtube className='h-3.5 w-3.5 text-white' />
                </span>
            </div>

            <h3 className='mt-3 truncate text-sm font-semibold capitalize dark:text-white'>
                {artist.name}
            </h3>
            <p className='mt-0.5 text-xs text-gray-500 dark:text-gray-400'>
                {artist.subscribers != null
                    ? `${formatCount(artist.subscribers)} subscribers`
                    : "YouTube artist"}
            </p>

            <span
                className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                    artist.is_in_library
                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                        : "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                }`}
            >
                {isImporting ? (
                    <Loader2 className='h-3 w-3 animate-spin' />
                ) : artist.is_in_library ? (
                    <Check className='h-3 w-3' />
                ) : (
                    <Play className='h-3 w-3 fill-current' />
                )}
                {isImporting ? "Importing..." : artist.is_in_library ? "In library" : "View artist"}
            </span>
        </div>
    )
}
