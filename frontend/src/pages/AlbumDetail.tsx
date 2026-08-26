import { ArrowLeft, Heart, Music2, Play } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { useAlbumDetail, useFavoriteAlbum, useUnfavoriteAlbum } from "@/hooks/useAlbums"
import { usePlayerStore } from "@/hooks/usePlayer"
import { toFavoritePayload } from "@/services/album.service"
import { type SearchAlbumItem } from "@/types"

export default function AlbumDetail() {
    const { browseId } = useParams<{ browseId: string }>()
    const { data, isLoading } = useAlbumDetail(browseId ?? null)
    const setPlaylist = usePlayerStore((s) => s.setPlaylist)
    const favoriteAlbum = useFavoriteAlbum()
    const unfavoriteAlbum = useUnfavoriteAlbum()

    if (isLoading) {
        return <p className='p-6 text-gray-500 dark:text-gray-400'>Loading album…</p>
    }

    if (!data) {
        return (
            <div className='p-10 text-center'>
                <p className='text-gray-500 dark:text-gray-400'>Album not found.</p>
                <Link to='/playlists' className='mt-2 inline-block text-red-500'>
                    Back to search
                </Link>
            </div>
        )
    }

    const { album, is_favorite, tracks } = data

    const payload: SearchAlbumItem = {
        id: album.browse_id,
        title: album.title,
        artists: album.artist_name ? [album.artist_name] : [],
        year: album.year,
        thumbnail: album.thumbnail_url ?? "",
        audio_playlist_id: album.audio_playlist_id,
    }

    const playAll = () => {
        if (tracks.length) {
            setPlaylist(tracks, 0, album.audio_playlist_id ?? undefined)
        }
    }

    const playTrack = (index: number) => {
        setPlaylist(tracks, index, album.audio_playlist_id ?? undefined)
    }

    return (
        <div className='p-6'>
            <Link
                to='/'
                className='mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 dark:text-gray-400'
            >
                <ArrowLeft className='h-4 w-4' />
                Back to search
            </Link>

            <div className='mb-8 flex flex-col gap-6 md:flex-row'>
                <div className='w-48 shrink-0'>
                    {album.thumbnail_url ? (
                        <img
                            src={album.thumbnail_url}
                            alt={album.title}
                            referrerPolicy='no-referrer'
                            className='aspect-square w-full rounded-lg object-cover'
                        />
                    ) : (
                        <div className='flex aspect-square w-full items-center justify-center rounded-lg bg-gray-100 dark:bg-white/10'>
                            <Music2 className='h-12 w-12 text-gray-400' />
                        </div>
                    )}
                </div>
                <div className='flex flex-col justify-end gap-3'>
                    <span className='text-xs uppercase tracking-wide text-gray-400'>Album</span>
                    <h1 className='text-3xl font-bold dark:text-white'>{album.title}</h1>
                    {album.artist_name && (
                        <p className='text-gray-500 dark:text-gray-400'>{album.artist_name}</p>
                    )}
                    <div className='mt-2 flex items-center gap-3'>
                        <button
                            type='button'
                            onClick={playAll}
                            disabled={!tracks.length}
                            className='flex items-center gap-2 rounded-full bg-red-500 px-5 py-2.5 font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50'
                        >
                            <Play className='h-4 w-4 fill-current' />
                            Play all
                        </button>
                        <button
                            type='button'
                            onClick={() =>
                                is_favorite
                                    ? unfavoriteAlbum.mutate(album.browse_id)
                                    : favoriteAlbum.mutate({
                                          browseId: album.browse_id,
                                          payload: toFavoritePayload(payload),
                                      })
                            }
                            className='flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors dark:border-white/10'
                        >
                            <Heart
                                className={`h-4 w-4 ${is_favorite ? "fill-current text-red-500" : ""}`}
                            />
                            {is_favorite ? "Favorited" : "Favorite"}
                        </button>
                    </div>
                </div>
            </div>

            <h2 className='mb-3 text-lg font-semibold dark:text-white'>Tracks</h2>
            {tracks.length === 0 ? (
                <p className='text-gray-500 dark:text-gray-400'>No tracks available.</p>
            ) : (
                <ul className='flex flex-col'>
                    {tracks.map((track, index) => (
                        <li
                            key={track.id ?? index}
                            className='flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-black/5 dark:hover:bg-white/5'
                        >
                            <button
                                type='button'
                                onClick={() => playTrack(index)}
                                className='flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white'
                                title={`Play ${track.title}`}
                            >
                                <Play className='h-4 w-4 fill-current' />
                            </button>
                            <div className='min-w-0 flex-1'>
                                <p className='line-clamp-1 text-sm font-medium dark:text-white'>
                                    {track.title}
                                </p>
                                <p className='line-clamp-1 text-xs text-gray-500 dark:text-gray-400'>
                                    {track.uploader ?? ""}
                                </p>
                            </div>
                            {typeof track.duration === "number" && (
                                <span className='text-xs text-gray-400'>
                                    {Math.floor(track.duration / 60)}:
                                    {String(track.duration % 60).padStart(2, "0")}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
