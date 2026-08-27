import ViewToggle from "@/components/ui/view-toggle/view-toggle"
import { AddToPlaylistModal } from "@/components/playlist/add-to-playlist-modal"
import { formatDuration } from "@/lib/utils"
import { toFavoritePayload } from "@/services/album.service"
import { useAlbumFavorites, useFavoriteAlbum, useUnfavoriteAlbum } from "@/hooks/useAlbums"
import { type SearchAlbumItem, type SearchResults as SearchResultsData, type SearchTopResult, type Song } from "@/types"
import {
    ArrowUpRight,
    Disc3,
    Download,
    Heart,
    Library,
    ListMusic,
    Loader2,
    Mic2,
    Play,
    Plus,
    UserRound,
} from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"

interface SearchResultsProps {
    results: SearchResultsData
    viewMode: "grid" | "list"
    onViewModeChange: (view: "grid" | "list") => void
    selectedSongIds: string[]
    onToggleSelect: (id: string, e: React.MouseEvent, songs: Song[]) => void
    onToggleSelectAll: (ids: string[]) => void
    onPlaySongs: (songs: Song[], index: number) => void
    onPlayTopResult: (top: SearchTopResult) => void
    onPlayCollection: (playlistId: string) => Promise<Song[]>
    onPlayArtist: (name: string) => Promise<void>
    onAddToQueue: (song: Song) => void
    onQueueSongs: (songs: Song[]) => void
    onDownload: (id: string) => void
}

export function SearchResults({
    results,
    viewMode,
    onViewModeChange,
    selectedSongIds,
    onToggleSelect,
    onToggleSelectAll,
    onPlaySongs,
    onPlayTopResult,
    onPlayCollection,
    onPlayArtist,
    onAddToQueue,
    onQueueSongs,
    onDownload,
}: SearchResultsProps) {
    const [playingKey, setPlayingKey] = useState<string | null>(null)
    const [playlistTarget, setPlaylistTarget] = useState<Song[] | null>(null)
    const { top_result: topResult, artists, albums, playlists, videos, songs } = results
    const { data: favoritesData } = useAlbumFavorites()
    const favoriteAlbum = useFavoriteAlbum()
    const unfavoriteAlbum = useUnfavoriteAlbum()
    const favoritedIds = useMemo(
        () => new Set((favoritesData ?? []).map((f) => f.album.browse_id)),
        [favoritesData],
    )

    const toggleAlbumFavorite = (album: SearchAlbumItem) => {
        const browseId = album.id
        if (!browseId) return
        if (favoritedIds.has(browseId)) {
            unfavoriteAlbum.mutate(browseId)
        } else {
            favoriteAlbum.mutate({ browseId, payload: toFavoritePayload(album) })
        }
    }

    const playCollection = async (key: string, playlistId: string | null) => {
        if (!playlistId || playingKey) return
        setPlayingKey(key)
        try {
            await onPlayCollection(playlistId)
        } finally {
            setPlayingKey(null)
        }
    }

    const playArtist = async (key: string, name: string) => {
        if (!name || playingKey) return
        setPlayingKey(key)
        try {
            await onPlayArtist(name)
        } finally {
            setPlayingKey(null)
        }
    }

    const playTop = (top: SearchTopResult) => {
        if (playingKey) return
        setPlayingKey(`top:${top.type}:${top.id ?? top.name ?? ""}`)
        onPlayTopResult(top)
        setPlayingKey(null)
    }

    const topToSong = (top: SearchTopResult): Song | null =>
        top.id
            ? {
                  id: top.id,
                  title: top.title ?? "",
                  uploader: top.uploader ?? "",
                  thumbnail: top.thumbnail ?? "",
                  duration: top.duration ?? 0,
                  created_at: "",
              }
            : null

    const resolveTopTracks = async (
        key: string,
        top: SearchTopResult,
    ): Promise<Song[]> => {
        if (top.type === "song" || top.type === "video") {
            const song = topToSong(top)
            return song ? [song] : []
        }
        if (top.type === "artist") return []
        const playlistId = top.audio_playlist_id ?? top.id
        if (!playlistId) return []
        setPlayingKey(key)
        try {
            return await onPlayCollection(playlistId)
        } finally {
            setPlayingKey(null)
        }
    }

    const queueTop = async (top: SearchTopResult) => {
        if (playingKey || top.type === "artist") return
        const tracks = await resolveTopTracks(
            `queue:${top.type}:${top.id ?? top.name ?? ""}`,
            top,
        )
        if (tracks.length > 0) onQueueSongs(tracks)
    }

    const addTopToPlaylist = async (top: SearchTopResult) => {
        if (playingKey || top.type === "artist") return
        const tracks = await resolveTopTracks(`pl:${top.type}:${top.id ?? top.name ?? ""}`, top)
        if (tracks.length > 0) setPlaylistTarget(tracks)
    }

    return (
        <div className='flex flex-col gap-8'>
            {topResult && (
                <div className='dark:bg-card flex items-center gap-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10'>
                    <button
                        type='button'
                        onClick={() => playTop(topResult)}
                        className='group relative block shrink-0 cursor-pointer overflow-hidden rounded-xl'
                        title={`Play ${topResult.name ?? topResult.title ?? ""}`}
                    >
                        {topResult.thumbnail ? (
                            <img
                                src={topResult.thumbnail}
                                alt={topResult.name ?? topResult.title ?? ""}
                                loading='lazy'
                                decoding='async'
                                referrerPolicy='no-referrer'
                                className={`h-36 w-36 object-cover ${
                                    topResult.type === "artist" ? "rounded-full" : ""
                                }`}
                            />
                        ) : (
                            <span className='dark:bg-card flex h-36 w-36 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 dark:border-white/10'>
                                <Disc3 className='h-12 w-12 text-gray-400' />
                            </span>
                        )}
                        <span className='absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100'>
                            <span className='flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg'>
                                {playingKey === `top:${topResult.type}:${topResult.id ?? topResult.name ?? ""}` ? (
                                    <Loader2 className='h-5 w-5 animate-spin' />
                                ) : (
                                    <Play className='h-6 w-6 translate-x-0.5 fill-current' />
                                )}
                            </span>
                        </span>
                    </button>
                    <div className='min-w-0'>
                        <p className='text-xs font-medium tracking-wide text-red-500 uppercase'>
                            Top result
                        </p>
                        <h2 className='mt-1 truncate text-xl font-bold dark:text-white'>
                            {topResult.name ?? topResult.title ?? "Unknown"}
                        </h2>
                        {(topResult.type === "song" || topResult.type === "video") && (
                            <p className='mt-0.5 flex items-center gap-2 truncate text-sm text-gray-500 dark:text-gray-400'>
                                <span className='truncate'>{topResult.uploader}</span>
                                {topResult.duration ? (
                                    <span className='shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-white/10 dark:text-gray-400'>
                                        {formatDuration(topResult.duration)}
                                    </span>
                                ) : null}
                            </p>
                        )}
                        {topResult.type === "album" && (
                            <p className='mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400'>
                                {(topResult.artists ?? []).join(", ") || "Album"}
                                {topResult.year ? ` · ${topResult.year}` : ""}
                            </p>
                        )}
                        {topResult.type === "playlist" && (
                            <p className='mt-0.5 text-sm text-gray-500 dark:text-gray-400'>
                                Playlist
                            </p>
                        )}
                        {topResult.type === "artist" && (
                            <p className='mt-0.5 text-sm text-gray-500 dark:text-gray-400'>
                                Artist
                            </p>
                        )}
                        <div className='mt-3 flex items-center gap-2'>
                            <button
                                type='button'
                                onClick={() => playTop(topResult)}
                                className='flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-all hover:bg-red-700 active:scale-95'
                            >
                                <Play className='h-4 w-4 fill-current' />
                                Play
                            </button>
                            {topResult.type !== "artist" && (
                                <>
                                    <button
                                        type='button'
                                        onClick={() => queueTop(topResult)}
                                        disabled={!!playingKey}
                                        className='flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-gray-100 px-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20'
                                        title='Add to queue'
                                    >
                                        {playingKey ===
                                        `queue:${topResult.type}:${topResult.id ?? topResult.name ?? ""}` ? (
                                            <Loader2 className='h-4 w-4 animate-spin' />
                                        ) : (
                                            <ListMusic className='h-4 w-4' />
                                        )}
                                        Queue
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => addTopToPlaylist(topResult)}
                                        disabled={!!playingKey}
                                        className='flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-gray-100 px-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20'
                                        title='Add to playlist'
                                    >
                                        {playingKey ===
                                        `pl:${topResult.type}:${topResult.id ?? topResult.name ?? ""}` ? (
                                            <Loader2 className='h-4 w-4 animate-spin' />
                                        ) : (
                                            <Plus className='h-4 w-4' />
                                        )}
                                        Playlist
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {(songs.length > 0 || videos.length > 0) && (
                <div className='flex flex-col gap-6'>
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-4'>
                            <button
                                onClick={() => onToggleSelectAll(songs.map((s) => s.id))}
                                className='cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 active:scale-95'
                            >
                                {selectedSongIds.length === songs.length
                                    ? "Deselect All"
                                    : "Select All"}
                            </button>
                            <p className='text-sm text-gray-600 dark:text-gray-400'>
                                {selectedSongIds.length} selected
                            </p>
                        </div>

                        <ViewToggle view={viewMode} onChange={onViewModeChange} />
                    </div>

                    <div
                        className={
                            viewMode === "grid"
                                ? "grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                                : "flex flex-col gap-2"
                        }
                    >
                        {songs.map((video, index) => {
                            const selected = selectedSongIds.includes(video.id)

                            return viewMode === "grid" ? (
                                <div
                                    key={video.id}
                                    onClick={(e) => onToggleSelect(video.id, e, songs)}
                                    className={`group relative cursor-pointer overflow-hidden rounded-xl border transition-all hover:-translate-y-1 hover:shadow-md ${
                                        selected
                                            ? "border-red-500 bg-red-50 ring-2 ring-red-500/50 dark:bg-red-950"
                                            : "dark:bg-card border-gray-200 bg-white dark:border-white/10"
                                    } `}
                                >
                                    <div className='relative aspect-video w-full overflow-hidden'>
                                        <img
                                            src={video.thumbnail}
                                            alt={video.title}
                                            loading='lazy'
                                            decoding='async'
                                            referrerPolicy='no-referrer'
                                            className='h-full w-full object-cover'
                                        />
                                        <div className='absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100'>
                                            <button
                                                onClick={() => onPlaySongs(songs, index)}
                                                className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform hover:scale-110'
                                                title='Play Now'
                                            >
                                                <Play className='h-5 w-5 translate-x-0.5 fill-current' />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onAddToQueue(video)
                                                }}
                                                className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white shadow-lg backdrop-blur-md transition-transform hover:scale-110'
                                                title='Add to Queue'
                                            >
                                                <ListMusic className='h-5 w-5' />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onDownload(video.id)
                                                }}
                                                className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white shadow-lg backdrop-blur-md transition-transform hover:scale-110'
                                                title='Download MP3'
                                            >
                                                <Download className='h-5 w-5' />
                                            </button>
                                        </div>
                                        {selected && (
                                            <div className='absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded bg-red-600 text-xs text-white shadow-lg'>
                                                ✓
                                            </div>
                                        )}
                                        <span className='absolute right-2 bottom-2 rounded bg-black/80 px-2 py-1 text-xs text-white'>
                                            {formatDuration(video.duration)}
                                        </span>
                                    </div>
                                    <div className='flex flex-col gap-1 p-3'>
                                        <h2 className='line-clamp-2 text-sm font-semibold dark:text-white'>
                                            {video.title || "Unknown Title"}
                                        </h2>
                                        <p className='text-xs text-gray-600 dark:text-gray-400'>
                                            {video.uploader || "Unknown Artist"}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    key={video.id}
                                    onClick={(e) => onToggleSelect(video.id, e, songs)}
                                    className={`group flex cursor-pointer items-center gap-4 rounded-xl border p-2 transition-all select-none ${
                                        selected
                                            ? "border-red-500 bg-red-50 dark:bg-red-950"
                                            : "dark:bg-card border-gray-100 bg-white hover:border-red-200 dark:border-white/10"
                                    }`}
                                >
                                    <div className='relative h-14 w-24 shrink-0 overflow-hidden rounded-lg'>
                                        <img
                                            src={video.thumbnail}
                                            alt={video.title}
                                            loading='lazy'
                                            decoding='async'
                                            referrerPolicy='no-referrer'
                                            className='h-full w-full object-cover'
                                        />
                                        <div className='absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100'>
                                            <button
                                                onClick={() => onPlaySongs(songs, index)}
                                                className='cursor-pointer rounded-full bg-red-600 p-1.5 text-white shadow-lg'
                                            >
                                                <Play className='h-4 w-4 translate-x-0.5 fill-current' />
                                            </button>
                                        </div>
                                    </div>
                                    <div className='min-w-0 flex-1'>
                                        <h3 className='truncate text-sm font-semibold dark:text-white'>
                                            {video.title || "Unknown Title"}
                                        </h3>
                                        <p className='truncate text-xs text-gray-500 dark:text-gray-400'>
                                            {video.uploader || "Unknown Artist"}
                                        </p>
                                    </div>
                                    <div className='flex items-center gap-2 pr-2'>
                                        <span className='mr-2 text-xs font-medium text-gray-400'>
                                            {formatDuration(video.duration)}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onAddToQueue(video)
                                            }}
                                            className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-black/5 hover:text-red-500 dark:hover:bg-white/5'
                                            title='Add to Queue'
                                        >
                                            <ListMusic className='h-4 w-4' />
                                        </button>
                                        {selected && (
                                            <div className='ml-2 flex h-5 w-5 items-center justify-center rounded bg-red-600 text-[10px] text-white'>
                                                ✓
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
            {artists.length > 0 && (
                <SearchRow title='Artists' icon={UserRound}>
                    {artists.map((artist) => (
                        <div key={artist.id ?? artist.name} className='w-36 shrink-0'>
                            <button
                                type='button'
                                onClick={() => playArtist(artist.name, artist.name)}
                                className='group flex w-full cursor-pointer flex-col items-center gap-2'
                                title={`Play ${artist.name}`}
                            >
                                <span className='relative block overflow-hidden rounded-full'>
                                    {artist.thumbnail ? (
                                        <img
                                            src={artist.thumbnail}
                                            alt={artist.name}
                                            loading='lazy'
                                            decoding='async'
                                            referrerPolicy='no-referrer'
                                            className='h-28 w-28 object-cover'
                                        />
                                    ) : (
                                        <span className='flex h-28 w-28 items-center justify-center bg-gray-100 dark:bg-white/10'>
                                            <Mic2 className='h-8 w-8 text-gray-400' />
                                        </span>
                                    )}
                                    <span className='absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100'>
                                        {playingKey === artist.name ? (
                                            <Loader2 className='h-6 w-6 animate-spin text-white' />
                                        ) : (
                                            <Play className='h-6 w-6 translate-x-0.5 fill-current text-white' />
                                        )}
                                    </span>
                                </span>
                                <span className='line-clamp-2 w-full text-center text-sm font-semibold dark:text-white'>
                                    {artist.name}
                                </span>
                            </button>
                        </div>
                    ))}
                </SearchRow>
            )}

            {albums.length > 0 && (
                <SearchRow title='Albums' icon={Disc3}>
                    {albums.map((album) => {
                        const browseId = album.id ?? album.title ?? ""
                        const isFav = browseId ? favoritedIds.has(browseId) : false
                        return (
                            <div
                                key={album.id ?? album.title}
                                className='relative w-40 shrink-0'
                            >
                                <button
                                    type='button'
                                    onClick={() =>
                                        playCollection(
                                            album.audio_playlist_id ?? album.id ?? album.title,
                                            album.audio_playlist_id ?? album.id,
                                        )
                                    }
                                    className='group flex w-full cursor-pointer flex-col gap-2 text-left'
                                    title={`Play ${album.title}`}
                                >
                                    <span className='relative block aspect-square w-full overflow-hidden rounded-lg'>
                                        {album.thumbnail ? (
                                            <img
                                                src={album.thumbnail}
                                                alt={album.title}
                                                loading='lazy'
                                                decoding='async'
                                                referrerPolicy='no-referrer'
                                                className='h-full w-full object-cover'
                                            />
                                        ) : (
                                            <span className='flex h-full w-full items-center justify-center bg-gray-100 dark:bg-white/10'>
                                                <Disc3 className='h-8 w-8 text-gray-400' />
                                            </span>
                                        )}
                                        <span className='absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100'>
                                            {playingKey === (album.id ?? album.title) ? (
                                                <Loader2 className='h-6 w-6 animate-spin text-white' />
                                            ) : (
                                                <Play className='h-6 w-6 translate-x-0.5 fill-current text-white' />
                                            )}
                                        </span>
                                    </span>
                                    <span className='line-clamp-1 text-sm font-semibold dark:text-white'>
                                        {album.title}
                                    </span>
                                    <span className='line-clamp-1 text-xs text-gray-500 dark:text-gray-400'>
                                        {(album.artists ?? []).join(", ")}
                                        {album.year ? ` · ${album.year}` : ""}
                                    </span>
                                </button>
                                <div className='absolute top-2 right-2 flex gap-1.5'>
                                    <button
                                        type='button'
                                        onClick={() => toggleAlbumFavorite(album)}
                                        className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70'
                                        title={isFav ? "Remove from My Albums" : "Add to My Albums"}
                                    >
                                        <Heart
                                            className={`h-4 w-4 ${isFav ? "fill-current text-red-500" : ""}`}
                                        />
                                    </button>
                                    <Link
                                        to={`/albums/${encodeURIComponent(browseId)}`}
                                        className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70'
                                        title='View album'
                                    >
                                        <ArrowUpRight className='h-4 w-4' />
                                    </Link>
                                </div>
                            </div>
                        )
                    })}
                </SearchRow>
            )}

            {playlists.length > 0 && (
                <SearchRow title='Playlists' icon={Library}>
                    {playlists.map((playlist) => (
                        <div key={playlist.id ?? playlist.title} className='w-40 shrink-0'>
                            <button
                                type='button'
                                onClick={() =>
                                    playCollection(
                                        playlist.id ?? playlist.title,
                                        playlist.id,
                                    )
                                }
                                className='group flex w-full cursor-pointer flex-col gap-2 text-left'
                                title={`Play ${playlist.title}`}
                            >
                                <span className='relative block aspect-square w-full overflow-hidden rounded-lg'>
                                    {playlist.thumbnail ? (
                                        <img
                                            src={playlist.thumbnail}
                                            alt={playlist.title}
                                            loading='lazy'
                                            decoding='async'
                                            referrerPolicy='no-referrer'
                                            className='h-full w-full object-cover'
                                        />
                                    ) : (
                                        <span className='flex h-full w-full items-center justify-center bg-gray-100 dark:bg-white/10'>
                                            <ListMusic className='h-8 w-8 text-gray-400' />
                                        </span>
                                    )}
                                    <span className='absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100'>
                                        {playingKey === (playlist.id ?? playlist.title) ? (
                                            <Loader2 className='h-6 w-6 animate-spin text-white' />
                                        ) : (
                                            <Play className='h-6 w-6 translate-x-0.5 fill-current text-white' />
                                        )}
                                    </span>
                                </span>
                                <span className='line-clamp-1 text-sm font-semibold dark:text-white'>
                                    {playlist.title}
                                </span>
                                <span className='text-xs text-gray-500 dark:text-gray-400'>
                                    {playlist.song_count ?? ""}
                                    {playlist.song_count ? " songs" : ""}
                                </span>
                            </button>
                        </div>
                    ))}
                </SearchRow>
            )}

            {playlistTarget && (
                <AddToPlaylistModal
                    songs={playlistTarget}
                    onClose={() => setPlaylistTarget(null)}
                />
            )}
        </div>
    )
}

function SearchRow({
    title,
    icon: Icon,
    children,
}: {
    title: string
    icon: typeof Disc3
    children: React.ReactNode
}) {
    return (
        <section>
            <div className='mb-4 flex items-center gap-2'>
                <Icon className='h-5 w-5 text-red-500' />
                <h2 className='text-lg font-bold dark:text-white'>{title}</h2>
            </div>
            <div
                className='flex gap-5 overflow-x-auto px-1 py-2'
                style={{ scrollbarWidth: "none" }}
            >
                {children}
            </div>
        </section>
    )
}
