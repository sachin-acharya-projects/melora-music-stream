import { Heart, Music2 } from "lucide-react"
import { Link } from "react-router-dom"
import { useAlbumFavorites, useUnfavoriteAlbum } from "@/hooks/useAlbums"

export default function MyAlbums() {
    const { data: favorites, isLoading } = useAlbumFavorites()
    const unfavoriteAlbum = useUnfavoriteAlbum()

    if (isLoading) {
        return <p className='p-6 text-gray-500 dark:text-gray-400'>Loading your albums…</p>
    }

    if (!favorites || favorites.length === 0) {
        return (
            <div className='flex flex-col items-center gap-3 p-10 text-center'>
                <Music2 className='h-10 w-10 text-gray-400' />
                <p className='text-gray-500 dark:text-gray-400'>
                    No albums yet. Favorite an album from search to keep it here.
                </p>
            </div>
        )
    }

    return (
        <div className='p-6'>
            <h1 className='mb-6 text-2xl font-bold dark:text-white'>My Albums</h1>
            <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'>
                {favorites.map(({ album }) => {
                    return (
                        <div key={album.id} className='group relative flex flex-col gap-2'>
                            <Link
                                to={`/albums/${encodeURIComponent(album.browse_id)}`}
                                className='flex flex-col gap-2'
                            >
                                <span className='relative block aspect-square w-full overflow-hidden rounded-lg'>
                                    {album.thumbnail_url ? (
                                        <img
                                            src={album.thumbnail_url}
                                            alt={album.title}
                                            loading='lazy'
                                            decoding='async'
                                            referrerPolicy='no-referrer'
                                            className='h-full w-full object-cover'
                                        />
                                    ) : (
                                        <span className='flex h-full w-full items-center justify-center bg-gray-100 dark:bg-white/10'>
                                            <Music2 className='h-8 w-8 text-gray-400' />
                                        </span>
                                    )}
                                </span>
                                <span className='line-clamp-1 text-sm font-semibold dark:text-white'>
                                    {album.title}
                                </span>
                                <span className='line-clamp-1 text-xs text-gray-500 dark:text-gray-400'>
                                    {album.artist_name ?? ""}
                                    {album.year ? ` · ${album.year}` : ""}
                                </span>
                            </Link>
                            <button
                                type='button'
                                onClick={() => unfavoriteAlbum.mutate(album.browse_id)}
                                className='absolute top-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70'
                                title='Remove from My Albums'
                            >
                                <Heart className='h-4 w-4 fill-current text-red-500' />
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
