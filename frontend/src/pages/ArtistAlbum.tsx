import { SongBrowser } from "@/components/song-browser/song-browser"
import { useArtist, useArtistAlbums } from "@/hooks/useArtists"
import { usePlayerStore } from "@/hooks/usePlayer"
import { useTitle } from "@/hooks/useTitle"
import { slugify } from "@/lib/utils"
import { type ArtistSong } from "@/types"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, Disc3, Loader2 } from "lucide-react"
import { useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"

export default function ArtistAlbum() {
    const navigate = useNavigate()
    const { slug, albumKey } = useParams<{ slug: string; albumKey: string }>()
    const { data: artist } = useArtist(slug ?? null)
    const albumsQuery = useArtistAlbums(slug ?? null)
    const setPlaylist = usePlayerStore((s) => s.setPlaylist)

    const album = useMemo(() => {
        if (!albumKey) return undefined
        const key = decodeURIComponent(albumKey)
        return (albumsQuery.data?.albums ?? []).find((a) => a.id === key || slugify(a.name) === key)
    }, [albumsQuery.data, albumKey])

    useTitle(album ? album.name : "Album")

    const songs = album?.songs ?? []
    const handlePlay = (list: ArtistSong[], index: number) => {
        setPlaylist(
            list.map((s) => ({ ...s, created_at: s.created_at ?? "" })),
            index,
            `album:${album?.id ?? album?.name}`,
        )
    }

    return (
        <div className='mx-auto w-full max-w-375 px-4 pt-10 pb-40'>
            <button
                onClick={() => navigate(`/artists/${slug}`)}
                className='mb-6 flex cursor-pointer items-center gap-1 text-sm text-gray-500 transition-colors hover:text-red-500'
            >
                <ChevronLeft className='h-4 w-4' /> {artist?.name ?? "Artist"}
            </button>

            {albumsQuery.isLoading ? (
                <div className='flex justify-center pt-20'>
                    <Loader2 className='h-12 w-12 animate-spin text-red-600' />
                </div>
            ) : !album ? (
                <div className='flex flex-col items-center gap-6 py-16 text-center'>
                    <span className='flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                        <Disc3 className='h-9 w-9 text-red-500' />
                    </span>
                    <div className='flex flex-col gap-1'>
                        <h2 className='text-lg font-semibold dark:text-white'>Album not found</h2>
                        <p className='text-sm text-gray-500 dark:text-gray-400'>
                            This album may have been removed.
                        </p>
                    </div>
                </div>
            ) : (
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={album.id ?? album.name}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className='mb-8 flex flex-col items-center gap-6 sm:flex-row sm:items-end'>
                            <div className='shrink-0'>
                                {(album.cover_image_url ?? songs[0]?.thumbnail) ? (
                                    <img
                                        src={album.cover_image_url ?? songs[0]?.thumbnail}
                                        alt={album.name}
                                        referrerPolicy='no-referrer'
                                        className='h-44 w-44 rounded-2xl object-cover shadow-lg sm:h-56 sm:w-56'
                                    />
                                ) : (
                                    <div className='flex h-44 w-44 items-center justify-center rounded-2xl bg-gradient-to-br from-red-400 to-red-600 shadow-lg sm:h-56 sm:w-56'>
                                        <Disc3 className='h-16 w-16 text-white' />
                                    </div>
                                )}
                            </div>
                            <div className='min-w-0 flex-1 text-center sm:text-left'>
                                <p className='text-xs font-medium tracking-wide text-red-500 uppercase'>
                                    Album
                                </p>
                                <h1 className='m-0 text-3xl leading-none font-bold capitalize dark:text-white'>
                                    {album.name}
                                </h1>
                                <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
                                    {songs.length} {songs.length === 1 ? "song" : "songs"}
                                </p>
                            </div>
                        </div>

                        <SongBrowser songs={songs} onPlay={handlePlay} />
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    )
}
