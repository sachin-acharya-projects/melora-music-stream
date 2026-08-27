import SearchForm from "@/components/search-form/search-form"
import { SearchResults } from "@/components/search-results/search-results"
import { SongSection } from "@/components/song-section/song-section"
import BulkActionBar from "@/components/ui/bulk-action-bar/bulk-action-bar"
import { useDiscover } from "@/hooks/useDiscover"
import { usePlayerStore } from "@/hooks/usePlayer"
import { usePlaylistOptions, usePlaylists } from "@/hooks/usePlaylists"
import { useQueueStore } from "@/hooks/useQueue"
import { useRecommendations } from "@/hooks/useRecommendations"
import { useRecentHistory } from "@/hooks/useRecentHistory"
import { useSearch, useSearchSuggestions } from "@/hooks/useSearch"
import { useSearchHistory } from "@/hooks/useSearchHistory"
import { useSongSelection } from "@/hooks/useSongSelection"
import { useThemeStore } from "@/hooks/useTheme"
import { useTitle } from "@/hooks/useTitle"
import { useTopSongs } from "@/hooks/useStats"
import { apiService } from "@/services/api.service"
import { type HistoryItem, type SearchTopResult, type Song } from "@/types"
import { openDownload, openDownloads } from "@/utils/download"
import { MESSAGES } from "@/utils/messages"
import {
    ListEnd,
    ListMusic,
    Loader2,
    Music2,
    Radio as RadioIcon,
    Search,
    User,
    type LucideIcon,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"

const RECENT_LIMIT = 10
const TOP_SONGS_LIMIT = 10

const historySongToSong = (item: HistoryItem): Song | null =>
    item.song
        ? {
              id: item.song.id,
              title: item.song.title ?? "",
              uploader: item.song.uploader ?? "",
              thumbnail: item.song.thumbnail ?? "",
              duration: item.song.duration ?? 0,
              created_at: item.played_at ?? "",
          }
        : null

export default function Home() {
    useTitle("Melora Music")
    const [searchQuery, setSearchQuery] = useState("")
    const [debouncedQuery, setDebouncedQuery] = useState("")
    const [playlistInput, setPlaylistInput] = useState("")
    const { selectedSongIds, toggleSelect, toggleSelectAll, clearSelection, getSelectedSongs } =
        useSongSelection()

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const quickActions: Array<{
        to: string
        label: string
        description: string
        icon: LucideIcon
    }> = [
        {
            to: "/playlists",
            label: "Playlists",
            description: "Manage your collections",
            icon: ListMusic,
        },
        { to: "/now-playing", label: "Now Playing", description: "Control playback", icon: Music2 },
        { to: "/queue", label: "Queue", description: "See what's next", icon: ListEnd },
        { to: "/profile", label: "Profile", description: "Your account", icon: User },
        { to: "/radio", label: "Radio", description: "Tune into moods", icon: RadioIcon },
    ]

    const { viewMode, setViewMode } = useThemeStore()
    const addDownloadQueue = useQueueStore((s) => s.add)
    const setPlaylist = usePlayerStore((s) => s.setPlaylist)
    const addToNowPlaying = usePlayerStore((s) => s.addToQueue)

    const { addSongsBulk, createPlaylist, isAddingBulk, isCreating } = usePlaylists({}, false)
    const { data: playlistOptions } = usePlaylistOptions()
    const {
        data: searchResult,
        isLoading: isSearchLoading,
        isFetching: isSearchFetching,
        isError,
        refetch,
    } = useSearch(debouncedQuery)
    const { data: searchSuggestions } = useSearchSuggestions(searchQuery)
    const videos = searchResult?.songs ?? []
    const searchCached = searchResult?.cached ?? false
    const hasSearchResults = useMemo(() => {
        if (!searchResult) return false
        return (
            searchResult.top_result !== null ||
            searchResult.artists.length > 0 ||
            searchResult.songs.length > 0 ||
            searchResult.albums.length > 0 ||
            searchResult.playlists.length > 0 ||
            searchResult.videos.length > 0
        )
    }, [searchResult])

    const { data: recentData, isLoading: recentLoading } = useRecentHistory(RECENT_LIMIT)
    const { data: recommendationsData, isLoading: recommendationsLoading } = useRecommendations()
    const { data: topSongsData, isLoading: topSongsLoading } = useTopSongs(TOP_SONGS_LIMIT)
    const { data: discoverData, isLoading: discoverLoading } = useDiscover()
    const { data: recentSearchesData } = useSearchHistory()
    const queryClient = useQueryClient()

    const discoverSongs = useMemo(
        () =>
            (discoverData?.top_songs ?? []).map((song) => ({
                ...song,
                created_at: song.created_at ?? "",
            })),
        [discoverData],
    )
    const newReleaseSongs = useMemo(() => {
        const seen = new Set<string>()
        const songs: Song[] = []
        for (const album of discoverData?.new_releases ?? []) {
            for (const song of album.songs) {
                if (song.id && !seen.has(song.id)) {
                    seen.add(song.id)
                    songs.push({ ...song, created_at: song.created_at ?? "" })
                }
            }
        }
        return songs
    }, [discoverData])
    const moodSongs = useMemo(() => {
        const seen = new Set<string>()
        const songs: Song[] = []
        for (const playlist of discoverData?.mood_playlists ?? []) {
            for (const song of playlist.songs) {
                if (song.id && !seen.has(song.id)) {
                    seen.add(song.id)
                    songs.push({ ...song, created_at: song.created_at ?? "" })
                }
            }
        }
        return songs
    }, [discoverData])

    const recentSongs = useMemo(
        () =>
            (recentData ?? [])
                .map(historySongToSong)
                .filter((song): song is Song => song !== null),
        [recentData],
    )
    const recommendedSongs = useMemo(
        () =>
            (recommendationsData ?? []).map((song) => ({
                ...song,
                created_at: song.created_at ?? "",
            })),
        [recommendationsData],
    )
    const topSongsList = useMemo(
        () =>
            (topSongsData ?? []).flatMap((entry) => {
                const song = entry.song
                if (!song?.id) return []
                return [
                    {
                        id: song.id,
                        title: song.title ?? "",
                        uploader: song.uploader ?? "",
                        thumbnail: song.thumbnail ?? "",
                        duration: song.duration ?? 0,
                        created_at: "",
                    },
                ]
            }),
        [topSongsData],
    )

    const onSearch = (q: string) => {
        setSearchQuery(q)
        setDebouncedQuery(q)
        clearSelection()
        queryClient.invalidateQueries({ queryKey: ["search-history"] })
    }

    const handleRefreshResults = async () => {
        try {
            await apiService.invalidateCache("search", debouncedQuery)
            await refetch()
            toast.success("Search results refreshed")
        } catch {
            toast.error(MESSAGES.CACHE_REFRESH_FAILED)
        }
    }

    const handleBulkAddToDownloadQueue = () => {
        const selectedSongs = getSelectedSongs(videos)
        selectedSongs.forEach((song) => {
            addDownloadQueue(song, "audio", false)
        })
        toast.success(`Added ${selectedSongs.length} items to download queue`)
        clearSelection()
    }

    const handleDownloadNow = () => {
        openDownloads(selectedSongIds)
        clearSelection()
    }

    const handleAddToPlaylist = async () => {
        if (!playlistInput) return

        const songsToAdd = getSelectedSongs(videos)

        try {
            const existing = (playlistOptions ?? []).find(
                (p) => p.name?.toLowerCase() === playlistInput.toLowerCase(),
            )
            let playlistId = existing?.id

            if (!playlistId) {
                const newPlaylist = await createPlaylist({ name: playlistInput })
                playlistId = newPlaylist.id
            }

            await addSongsBulk({ playlistId: playlistId!, songs: songsToAdd })

            toast.success(`Added ${songsToAdd.length} songs to ${playlistInput}`)
            clearSelection()
            setPlaylistInput("")
        } catch {
            toast.error(MESSAGES.ADD_SONGS_TO_PLAYLIST_FAILED)
        }
    }

    const playSongs = (songs: Song[], index: number, context?: string) => {
        setPlaylist(
            songs.map((s) => ({ ...s, created_at: s.created_at ?? "" })),
            index,
            context ?? null,
        )
    }

    const handlePlaySelected = () => {
        const selected = getSelectedSongs(videos)
        if (selected.length > 0) {
            setPlaylist(
                selected.map((s) => ({ ...s, created_at: s.created_at ?? "" })),
                0,
            )
            clearSelection()
        }
    }

    const handlePlayCollection = async (playlistId: string): Promise<Song[]> => {
        try {
            const tracks = await apiService.getSearchTracks(playlistId)
            if (tracks.length > 0) {
                playSongs(tracks, 0)
            }
            return tracks
        } catch {
            toast.error(MESSAGES.SEARCH_PLAY_FAILED)
            return []
        }
    }

    const handlePlayArtist = async (name: string) => {
        try {
            const result = await apiService.search(name)
            const artistSongs = result.songs ?? []
            if (artistSongs.length > 0) {
                playSongs(artistSongs, 0)
            }
        } catch {
            toast.error(MESSAGES.SEARCH_PLAY_FAILED)
        }
    }

    const handlePlayTopResult = (top: SearchTopResult) => {
        if (top.type === "song" || top.type === "video") {
            if (top.id) {
                playSongs(
                    [
                        {
                            id: top.id,
                            title: top.title ?? "",
                            uploader: top.uploader ?? "",
                            thumbnail: top.thumbnail ?? "",
                            duration: top.duration ?? 0,
                            created_at: "",
                        },
                    ],
                    0,
                )
            }
            return
        }
        if (top.type === "artist" && top.name) {
            void handlePlayArtist(top.name)
            return
        }
        const playlistId = top.audio_playlist_id ?? top.id
        if (playlistId) {
            void handlePlayCollection(playlistId)
        }
    }

    const isPlaylistActionLoading = isAddingBulk || isCreating

    return (
        <div className='flex flex-col items-center gap-6 md:gap-12'>
            {/* Header */}
            <div className='flex flex-col items-center gap-5 px-4 pt-2 md:pt-32'>
                <h1 className='text-center text-4xl font-bold text-shadow-md dark:text-white md:text-5xl'>
                    <span className='text-red-500'>Melora</span> Music
                </h1>

                <p className='text-center text-gray-500 dark:text-gray-400'>
                    Search, discover, and stream your favorite music
                </p>

                <SearchForm
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    onSearch={onSearch}
                    isLoading={isSearchLoading}
                    isRefreshing={isSearchFetching}
                    cached={searchCached && !!debouncedQuery}
                    onRefresh={handleRefreshResults}
                    suggestions={searchSuggestions}
                    recentSearches={recentSearchesData?.map((e) => e.query) ?? []}
                />

                <div className='mt-4 grid w-full max-w-4xl grid-cols-2 gap-4 md:grid-cols-5'>
                    {quickActions.map((action) => (
                        <Link
                            key={action.to}
                            to={action.to}
                            className='group dark:bg-card flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-5 text-center transition-all hover:-translate-y-1 hover:border-red-300 hover:shadow-md dark:border-white/10 dark:hover:border-red-800'
                        >
                            <span className='flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-600 transition-colors group-hover:bg-red-600 group-hover:text-white dark:bg-red-950 dark:text-red-400'>
                                <action.icon className='h-5 w-5' />
                            </span>
                            <span className='text-sm font-semibold dark:text-white'>
                                {action.label}
                            </span>
                            <span className='text-xs text-gray-500 dark:text-gray-400'>
                                {action.description}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Content Section */}
            <div className='mx-auto w-full max-w-375 px-4 pb-40'>
                {debouncedQuery && searchResult && hasSearchResults && (
                    <SearchResults
                        results={searchResult}
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                        selectedSongIds={selectedSongIds}
                        onToggleSelect={toggleSelect}
                        onToggleSelectAll={toggleSelectAll}
                        onPlaySongs={playSongs}
                        onPlayTopResult={handlePlayTopResult}
                        onPlayCollection={handlePlayCollection}
                        onPlayArtist={handlePlayArtist}
                        onAddToQueue={(song) => {
                            addToNowPlaying(song)
                            toast.success(MESSAGES.QUEUE_ADDED)
                        }}
                        onQueueSongs={(songs) => {
                            songs.forEach((song) => addToNowPlaying(song))
                            toast.success(`Added ${songs.length} songs to queue`)
                        }}
                        onDownload={openDownload}
                    />
                )}

                {!isSearchLoading && debouncedQuery && !hasSearchResults && !isError && (
                    <div className='-mt-4 flex flex-col items-center gap-4 pt-16 text-center'>
                        <span className='flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                            <Search className='h-9 w-9 text-red-500' />
                        </span>
                        <div className='flex flex-col gap-1'>
                            <h2 className='text-lg font-semibold dark:text-white'>
                                No results found
                            </h2>
                            <p className='text-sm text-gray-500 dark:text-gray-400'>
                                Nothing matched "{searchQuery}". Try a different search.
                            </p>
                        </div>
                    </div>
                )}

                {!isSearchLoading && !searchQuery && !isError && (
                    <div className='-mt-4'>
                        <SongSection
                            title='Recently played'
                            subtitle='Jump back into your latest listens'
                            songs={recentSongs}
                            isLoading={recentLoading}
                            onPlay={(songs, index) =>
                                playSongs(
                                    songs.map((s) => ({ ...s, created_at: s.created_at ?? "" })),
                                    index,
                                    "recent",
                                )
                            }
                            viewAllHref='/recently-played'
                        />
                        <SongSection
                            title='Made for you'
                            subtitle='Suggested from your listening history'
                            songs={recommendedSongs}
                            isLoading={recommendationsLoading}
                            onPlay={(songs, index) =>
                                playSongs(
                                    songs.map((s) => ({ ...s, created_at: s.created_at ?? "" })),
                                    index,
                                    "recommendations",
                                )
                            }
                            viewAllHref='/recommendations'
                        />
                        <SongSection
                            title='Top songs'
                            subtitle='Your most played'
                            songs={topSongsList}
                            isLoading={topSongsLoading}
                            onPlay={(songs, index) =>
                                playSongs(
                                    songs.map((s) => ({ ...s, created_at: s.created_at ?? "" })),
                                    index,
                                    "top-songs",
                                )
                            }
                        />
                        <SongSection
                            title='Trending now'
                            subtitle='What the world is listening to'
                            songs={discoverSongs}
                            isLoading={discoverLoading}
                            onPlay={(songs, index) =>
                                playSongs(
                                    songs.map((s) => ({ ...s, created_at: s.created_at ?? "" })),
                                    index,
                                    "discover",
                                )
                            }
                        />
                        <SongSection
                            title='New releases'
                            subtitle='Fresh albums worth a listen'
                            songs={newReleaseSongs}
                            isLoading={discoverLoading}
                            onPlay={(songs, index) =>
                                playSongs(
                                    songs.map((s) => ({ ...s, created_at: s.created_at ?? "" })),
                                    index,
                                    "discover",
                                )
                            }
                        />
                        <SongSection
                            title='Moods'
                            subtitle='Curated for how you feel'
                            songs={moodSongs}
                            isLoading={discoverLoading}
                            onPlay={(songs, index) =>
                                playSongs(
                                    songs.map((s) => ({ ...s, created_at: s.created_at ?? "" })),
                                    index,
                                    "discover",
                                )
                            }
                        />
                        {recentSongs.length === 0 &&
                            recommendedSongs.length === 0 &&
                            topSongsList.length === 0 &&
                            !recentLoading &&
                            !recommendationsLoading &&
                            !topSongsLoading && (
                                <div className='flex flex-col items-center gap-4 pt-16 text-center'>
                                    <span className='flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                                        <Music2 className='h-9 w-9 text-red-500' />
                                    </span>
                                    <div className='flex flex-col gap-1'>
                                        <h2 className='text-lg font-semibold dark:text-white'>
                                            Discover new music
                                        </h2>
                                        <p className='text-sm text-gray-500 dark:text-gray-400'>
                                            Search for songs, artists, or albums to start listening
                                        </p>
                                    </div>
                                </div>
                            )}
                    </div>
                )}

                {isSearchLoading && (
                    <div className='flex justify-center py-20'>
                        <Loader2 className='h-10 w-10 animate-spin text-red-600' />
                    </div>
                )}

                {isError && (
                    <div className='-mt-4 text-center text-red-500'>
                        Search failed. Please try again.
                    </div>
                )}
            </div>

            <BulkActionBar
                isVisible={selectedSongIds.length > 0}
                selectedCount={selectedSongIds.length}
                totalCount={videos.length}
                onSelectAll={() => toggleSelectAll(videos.map((v) => v.id))}
                onPlay={handlePlaySelected}
                playlists={playlistOptions ?? []}
                playlistValue={playlistInput}
                onPlaylistValueChange={setPlaylistInput}
                onAddToPlaylist={handleAddToPlaylist}
                isPlaylistLoading={isPlaylistActionLoading}
                onAddToQueue={handleBulkAddToDownloadQueue}
                onDownload={handleDownloadNow}
                onClear={clearSelection}
            />
        </div>
    )
}
