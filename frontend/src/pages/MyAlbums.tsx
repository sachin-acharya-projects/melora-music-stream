import { Heart, Music2 } from "lucide-react"
import { Link } from "react-router-dom"
import { useAlbumFavorites, useUnfavoriteAlbum } from "@/hooks/useAlbums"
import { useTitle } from "@/hooks/useTitle"

export default function MyAlbums() {
    useTitle("My Albums")
    const { data: favorites, isLoading } = useAlbumFavorites()
    const unfavoriteAlbum = useUnfavoriteAlbum()

    return (
        <div className='mx-auto w-full max-w-none px-4 pt-4 pb-40'>
            <div className='mb-6'>
                <h1 className='text-3xl font-bold dark:text-white'>
                    My <span className='text-red-500'>Albums</span>
                </h1>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                    Albums you have saved to your library
                </p>
            </div>

            {isLoading ? (
                <p className='py-8 text-sm text-gray-500 dark:text-gray-400'>
                    Loading your albums…
                </p>
            ) : !favorites || favorites.length === 0 ? (
                <div className='flex flex-col items-center gap-3 py-16 text-center'>
                    <Music2 className='h-10 w-10 text-gray-400' />
                    <div className='flex flex-col gap-1'>
                        <p className='font-medium dark:text-white'>No albums yet</p>
                        <p className='text-sm text-gray-500 dark:text-gray-400'>
                            Favorite an album from search to keep it here.
                        </p>
                    </div>
                </div>
            ) : (
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
                                    aria-label={`Remove ${album.title} from My Albums`}
                                >
                                    <Heart className='h-4 w-4 fill-current text-red-500' />
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
