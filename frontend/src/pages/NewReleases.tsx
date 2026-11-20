import { ImageWithFallback } from "@/components/ui/image-with-fallback/image-with-fallback"
import { useDiscover } from "@/hooks/useDiscover"
import { usePlayerStore } from "@/hooks/usePlayer"
import { useTitle } from "@/hooks/useTitle"
import { Loader2, Music2, Play } from "lucide-react"
import { Link } from "react-router-dom"

export default function NewReleases() {
    useTitle("New Releases")
    const { data, isLoading, isError } = useDiscover()
    const setPlaylist = usePlayerStore((state) => state.setPlaylist)
    const albums = data?.new_releases ?? []

    const playAlbum = (index: number) => {
        const songs = albums[index]?.songs ?? []
        if (songs.length > 0) {
            setPlaylist(
                songs.map((song) => ({ ...song, created_at: song.created_at ?? "" })),
                0,
                "discover",
            )
        }
    }

    return (
        <div className='mx-auto w-full max-w-none px-4 pt-4 pb-40'>
            <div className='mb-8'>
                <div className='flex items-center gap-3'>
                    <span aria-hidden='true' className='h-9 w-1 shrink-0 rounded-full bg-red-500' />
                    <div>
                        <h1 className='text-3xl font-bold tracking-tight text-gray-900 dark:text-white'>
                            New <span className='text-red-500'>Releases</span>
                        </h1>
                        <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                            Fresh albums and music worth discovering
                        </p>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className='flex justify-center py-16'>
                    <Loader2 className='h-8 w-8 animate-spin text-red-500' />
                </div>
            ) : isError ? (
                <div className='py-16 text-center text-sm text-red-500'>
                    Couldn't load new releases. Please try again.
                </div>
            ) : albums.length === 0 ? (
                <div className='flex flex-col items-center gap-3 py-16 text-center'>
                    <Music2 className='h-10 w-10 text-gray-400' />
                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                        No new releases are available right now.
                    </p>
                </div>
            ) : (
                <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7'>
                    {albums.map((album, index) => (
                        <article key={album.browse_id ?? album.audio_playlist_id ?? album.title} className='group min-w-0'>
                            <div className='relative mb-2 aspect-square overflow-hidden rounded-xl'>
                                <ImageWithFallback
                                    src={album.thumbnail}
                                    alt={album.title}
                                    className='h-full w-full transition-transform duration-300 group-hover:scale-105'
                                />
                                <button
                                    type='button'
                                    onClick={() => playAlbum(index)}
                                    disabled={!album.songs.length}
                                    aria-label={`Play ${album.title}`}
                                    className='absolute right-3 bottom-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 disabled:hidden'
                                >
                                    <Play className='h-5 w-5 fill-current' />
                                </button>
                            </div>
                            <div className='min-w-0'>
                                {album.browse_id ? (
                                    <Link
                                        to={`/albums/${encodeURIComponent(album.browse_id)}`}
                                        className='line-clamp-2 text-sm font-semibold text-gray-900 hover:text-red-500 dark:text-white'
                                    >
                                        {album.title}
                                    </Link>
                                ) : (
                                    <button
                                        type='button'
                                        onClick={() => playAlbum(index)}
                                        className='line-clamp-2 text-left text-sm font-semibold text-gray-900 hover:text-red-500 dark:text-white'
                                    >
                                        {album.title}
                                    </button>
                                )}
                                <p className='mt-1 line-clamp-1 text-xs text-gray-500 dark:text-gray-400'>
                                    {album.artists.join(", ") || "Unknown artist"}
                                </p>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    )
}
