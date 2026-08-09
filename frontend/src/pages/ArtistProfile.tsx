import { ArtistMoreInfoModal } from "@/components/artist-more-info/artist-more-info-modal"
import { RecentlyPlayedCard } from "@/components/recently-played-card/recently-played-card"
import { SongBrowser } from "@/components/song-browser/song-browser"
import {
    useArtist,
    useArtistAlbums,
    useArtistRecentlyPlayed,
    useArtistSongs,
    useFollowArtist,
} from "@/hooks/useArtists"
import { usePlayerStore } from "@/hooks/usePlayer"
import { useDragScroll } from "@/hooks/useDragScroll"
import { useTitle } from "@/hooks/useTitle"
import { cn, formatDuration } from "@/lib/utils"
import { type ArtistAlbum, type ArtistSong } from "@/types"
import { AnimatePresence, motion } from "framer-motion"
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    Disc3,
    Heart,
    Info,
    Loader2,
    Mic2,
    Play,
    Shuffle,
    Youtube,
} from "lucide-react"
import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

type ArtistTab = "songs" | "albums"

const slugify = (name: string) =>
    name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")

const albumKey = (album: ArtistAlbum) =>
    album.id ? encodeURIComponent(album.id) : slugify(album.name)

const toSongs = (songs: ArtistSong[]) =>
    songs.map((s) => ({ ...s, created_at: s.created_at ?? "" }))

export default function ArtistProfile() {
    const navigate = useNavigate()
    const { slug } = useParams<{ slug: string }>()
    const [tab, setTab] = useState<ArtistTab>("songs")
    const [showMoreInfo, setShowMoreInfo] = useState(false)

    const { data: artist, isLoading } = useArtist(slug ?? null)
    const songsQuery = useArtistSongs(slug ?? null)
    const albumsQuery = useArtistAlbums(tab === "albums" ? (slug ?? null) : null)
    const recentlyPlayedQuery = useArtistRecentlyPlayed(slug ?? null)
    const followArtist = useFollowArtist()
    const setPlaylist = usePlayerStore((s) => s.setPlaylist)
    const { ref: recentlyPlayedScrollRef, isDragging, handlers } = useDragScroll<HTMLDivElement>()

    const scrollRecentlyPlayed = (dir: 1 | -1) => {
        recentlyPlayedScrollRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" })
    }

    useTitle(artist ? artist.name : "Artist")

    if (isLoading && !artist) {
        return (
            <div className='flex justify-center pt-20'>
                <Loader2 className='h-12 w-12 animate-spin text-red-600' />
            </div>
        )
    }

    if (!artist) {
        return (
            <div className='mx-auto w-full max-w-375 px-4 pt-10 pb-40'>
                <button
                    onClick={() => navigate("/artists")}
                    className='mb-6 flex cursor-pointer items-center gap-1 text-sm text-gray-500 transition-colors hover:text-red-500'
                >
                    <ChevronLeft className='h-4 w-4' /> Artists
                </button>
                <div className='flex flex-col items-center gap-6 py-16 text-center'>
                    <span className='flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                        <Mic2 className='h-9 w-9 text-red-500' />
                    </span>
                    <div className='flex flex-col gap-1'>
                        <h2 className='text-lg font-semibold dark:text-white'>Artist not found</h2>
                        <p className='text-sm text-gray-500 dark:text-gray-400'>
                            This artist may have been removed.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    const songs = songsQuery.data ?? []
    const playableSongs = toSongs(songs)
    const totalDuration = playableSongs.reduce((acc, s) => acc + (s.duration || 0), 0)
    const recentlyPlayed = recentlyPlayedQuery.data ?? []

    const handlePlay = (list: ArtistSong[], index: number) => {
        setPlaylist(toSongs(list), index, `artist:${artist.id}`)
    }

    const handleShuffle = () => {
        setPlaylist(playableSongs, 0, `artist:${artist.id}`)
    }

    const handleFollow = async () => {
        await followArtist.mutateAsync(artist.id)
    }

    const renderAlbums = () => {
        const albums = albumsQuery.data?.albums ?? []
        if (albumsQuery.isLoading) {
            return (
                <div className='flex justify-center pt-12'>
                    <Loader2 className='h-10 w-10 animate-spin text-red-600' />
                </div>
            )
        }
        if (albums.length === 0) {
            return (
                <div className='flex flex-col items-center gap-4 py-16 text-center'>
                    <span className='flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                        <Disc3 className='h-9 w-9 text-red-500' />
                    </span>
                    <h2 className='text-lg font-semibold dark:text-white'>No albums</h2>
                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                        No albums available for this artist.
                    </p>
                </div>
            )
        }
        return (
            <div className='grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5'>
                {albums.map((album) => {
                    const cover = album.cover_image_url ?? album.songs[0]?.thumbnail ?? ""
                    return (
                        <div
                            key={album.id ?? album.name}
                            onClick={() => navigate(`/artists/${slug}/album/${albumKey(album)}`)}
                            className='dark:bg-card group cursor-pointer rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition-all hover:-translate-y-1 hover:border-red-300 hover:shadow-lg dark:border-white/10'
                        >
                            <div className='relative aspect-square w-full overflow-hidden rounded-xl'>
                                {cover ? (
                                    <img
                                        src={cover}
                                        alt={album.name}
                                        className='h-full w-full object-cover'
                                    />
                                ) : (
                                    <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-red-400 to-red-600'>
                                        <Disc3 className='h-10 w-10 text-white' />
                                    </div>
                                )}
                            </div>
                            <h3 className='mt-3 truncate text-sm font-semibold dark:text-white'>
                                {album.name}
                            </h3>
                            <p className='mt-0.5 text-xs text-gray-500 dark:text-gray-400'>
                                {album.songs.length} {album.songs.length === 1 ? "song" : "songs"}
                            </p>
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className='mx-auto w-full max-w-375 px-4 pt-10 pb-40'>
            <button
                onClick={() => navigate("/artists")}
                className='mb-6 flex cursor-pointer items-center gap-1 text-sm text-gray-500 transition-colors hover:text-red-500'
            >
                <ChevronLeft className='h-4 w-4' /> Artists
            </button>

            <div className='mb-8 flex flex-col items-center gap-6 sm:flex-row sm:items-end'>
                <div className='shrink-0'>
                    {artist.thumbnail_url ? (
                        <img
                            src={artist.thumbnail_url}
                            alt={artist.name}
                            className='h-44 w-44 rounded-full object-cover shadow-lg sm:h-56 sm:w-56'
                        />
                    ) : (
                        <div className='flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-lg sm:h-56 sm:w-56'>
                            <span className='text-6xl font-bold text-white'>
                                {artist.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                </div>

                <div className='min-w-0 flex-1 text-center sm:text-left'>
                    <div className='flex flex-wrap items-center justify-center gap-2 sm:justify-start'>
                        <h1 className='m-0 text-3xl leading-none font-bold capitalize dark:text-white'>
                            {artist.name}
                        </h1>
                        {artist.is_from_youtube && (
                            <span className='inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-950 dark:text-red-400'>
                                <Youtube className='h-3.5 w-3.5' /> YouTube
                            </span>
                        )}
                    </div>
                    <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                        {artist.follower_count.toLocaleString()}{" "}
                        {artist.follower_count === 1 ? "follower" : "followers"}
                        {artist.monthly_listeners != null &&
                            ` · ${artist.monthly_listeners.toLocaleString()} monthly listeners`}
                    </p>

                    {artist.genres.length > 0 && (
                        <div className='mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start'>
                            {artist.genres.map((genre) => (
                                <span
                                    key={genre}
                                    className='rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300'
                                >
                                    {genre}
                                </span>
                            ))}
                        </div>
                    )}

                    {artist.bio && (
                        <p className='mt-3 max-w-xl text-sm text-gray-500 dark:text-gray-400'>
                            {artist.bio}
                        </p>
                    )}

                    <div className='mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start'>
                        <button
                            onClick={() => handlePlay(playableSongs, 0)}
                            disabled={playableSongs.length === 0}
                            className='flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'
                        >
                            <Play className='h-4 w-4 translate-x-0.5 fill-current' /> Play
                        </button>
                        <button
                            onClick={handleShuffle}
                            disabled={playableSongs.length === 0}
                            className='dark:bg-card flex h-10 cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium transition-all hover:border-red-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-white'
                        >
                            <Shuffle className='h-4 w-4' /> Shuffle
                        </button>
                        <button
                            onClick={handleFollow}
                            disabled={followArtist.isPending}
                            className={cn(
                                "flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50",
                                artist.is_following
                                    ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
                                    : "dark:bg-card border-gray-200 bg-white hover:border-red-200 dark:border-white/10 dark:text-white",
                            )}
                        >
                            {followArtist.isPending ? (
                                <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                                <Heart
                                    className={cn(
                                        "h-4 w-4",
                                        artist.is_following && "fill-red-500 text-red-500",
                                    )}
                                />
                            )}
                            {artist.is_following ? "Following" : "Follow"}
                        </button>
                        {artist.more_info && (
                            <button
                                onClick={() => setShowMoreInfo(true)}
                                className='dark:bg-card flex h-10 cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium transition-all hover:border-red-200 dark:border-white/10 dark:text-white'
                            >
                                <Info className='h-4 w-4' /> More Info
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {recentlyPlayed.length > 0 && (
                <section className='mb-10'>
                    <div className='mb-4 flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                            <Clock className='h-4 w-4 text-red-500' />
                            <h2 className='text-lg font-bold dark:text-white'>
                                Recently played by you
                            </h2>
                        </div>
                        <div className='flex items-center gap-4'>
                            <Link
                                to={`/artists/${slug}/recently-played`}
                                className='flex h-8 cursor-pointer items-center text-sm leading-none font-medium text-red-600 transition-colors hover:text-red-700 dark:text-red-400'
                            >
                                View All
                            </Link>
                            <div className='flex items-center gap-2'>
                                <button
                                    onClick={() => scrollRecentlyPlayed(-1)}
                                    className='dark:bg-card flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border bg-white shadow-sm transition-colors hover:border-red-200 dark:border-white/10 dark:text-white'
                                    title='Scroll left'
                                >
                                    <ChevronLeft className='h-4 w-4' />
                                </button>
                                <button
                                    onClick={() => scrollRecentlyPlayed(1)}
                                    className='dark:bg-card flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border bg-white shadow-sm transition-colors hover:border-red-200 dark:border-white/10 dark:text-white'
                                    title='Scroll right'
                                >
                                    <ChevronRight className='h-4 w-4' />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div
                        ref={recentlyPlayedScrollRef}
                        {...handlers}
                        className={`flex gap-5 overflow-x-auto px-1 py-2 ${
                            isDragging ? "cursor-grabbing select-none" : "cursor-grab"
                        }`}
                        style={{ scrollbarWidth: "none" }}
                    >
                        {recentlyPlayed.map((song, index) => (
                            <RecentlyPlayedCard
                                key={song.id}
                                song={song}
                                onClick={() => handlePlay(recentlyPlayed, index)}
                            />
                        ))}
                    </div>
                </section>
            )}

            <div className='sticky top-22 z-40 -mx-4 mb-4 border-y border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-sm dark:border-white/5 dark:bg-black/90'>
                <div className='dark:bg-card inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-white/10'>
                    {(["songs", "albums"] as ArtistTab[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                                tab === t
                                    ? "bg-red-600 text-white"
                                    : "text-gray-600 hover:text-red-500 dark:text-gray-300"
                            }`}
                        >
                            {t === "songs" ? `Songs (${songs.length})` : "Albums"}
                        </button>
                    ))}
                </div>
                <p className='mt-2 text-xs text-gray-400'>
                    {songs.length} {songs.length === 1 ? "song" : "songs"} ·{" "}
                    {formatDuration(totalDuration)}
                </p>
            </div>

            <AnimatePresence mode='wait'>
                <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                >
                    {tab === "songs" ? (
                        <SongBrowser
                            songs={songs}
                            isLoading={songsQuery.isLoading && !songsQuery.data}
                            onPlay={handlePlay}
                        />
                    ) : (
                        renderAlbums()
                    )}
                </motion.div>
            </AnimatePresence>

            {showMoreInfo && artist.more_info && (
                <ArtistMoreInfoModal
                    artistName={artist.name}
                    info={artist.more_info}
                    onClose={() => setShowMoreInfo(false)}
                />
            )}
        </div>
    )
}
