import { ArtistSection } from "@/components/artist-section/artist-section"
import { ArtistCard } from "@/components/artist-card/artist-card"
import { YouTubeArtistCard } from "@/components/artist-card/youtube-artist-card"
import SortSelect, { type SortSelectOption } from "@/components/ui/sort-select/sort-select"
import {
    useArtists,
    useFeaturedArtists,
    useFollowArtist,
    useFollowingArtists,
    useImportYouTubeArtist,
    useYouTubeArtists,
} from "@/hooks/useArtists"
import { useTitle } from "@/hooks/useTitle"
import { useAuth } from "@/hooks/useAuth"
import { type ArtistSortField, type ArtistSortOptions } from "@/services/artist.service"
import { type Artist, type YouTubeArtist } from "@/types"
import { AnimatePresence, motion } from "framer-motion"
import { LayoutGrid, List, Loader2, Mic2, Search, Users, Youtube } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "react-toastify"

export type ArtistsTab = "browse" | "following" | "youtube"

const VALID_TABS: ArtistsTab[] = ["browse", "following", "youtube"]

const VALID_SORT_FIELDS: ArtistSortField[] = [
    "follower_count",
    "name",
    "monthly_listeners",
    "created_at",
    "plays",
]

const FOLLOWING_SOURCE_OPTIONS: {
    value: "all" | "youtube" | "platform"
    label: string
}[] = [
    { value: "all", label: "All" },
    { value: "youtube", label: "YouTube" },
    { value: "platform", label: "Platform" },
]

const ARTIST_SORT_OPTIONS: SortSelectOption[] = [
    { value: "follower_count:desc", label: "Most followed" },
    { value: "plays:desc", label: "Most played" },
    { value: "created_at:desc", label: "Recently added" },
    { value: "follower_count:asc", label: "Least followed" },
    { value: "name:asc", label: "Name A–Z" },
    { value: "name:desc", label: "Name Z–A" },
]

const SECTION_SORT: Record<string, ArtistSortOptions> = {
    popular: { sort_by: "monthly_listeners", order: "desc" },
    top: { sort_by: "plays", order: "desc" },
    most_followed: { sort_by: "follower_count", order: "desc" },
    recent: { sort_by: "created_at", order: "desc" },
}

const TAB_LABELS: Record<ArtistsTab, { title: string; subtitle: string }> = {
    browse: {
        title: "Browse",
        subtitle: "Discover artists from your music library",
    },
    following: {
        title: "Following",
        subtitle: "Artists you're following",
    },
    youtube: {
        title: "YouTube",
        subtitle: "Browse and import artists straight from YouTube",
    },
}

const CONTENT_MOTION = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.2 },
}

export default function Artists() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [searchParams, setSearchParams] = useSearchParams()
    const [query, setQuery] = useState("")
    const [debouncedQuery, setDebouncedQuery] = useState("")
    const [importingChannelId, setImportingChannelId] = useState<string | null>(null)
    const [followingSource, setFollowingSource] = useState<"all" | "youtube" | "platform">("all")

    const isAdmin = user?.role === "admin"
    const tabs: ArtistsTab[] = isAdmin ? VALID_TABS : VALID_TABS.filter((t) => t !== "youtube")

    const rawTab = searchParams.get("view")
    const tab: ArtistsTab = tabs.includes(rawTab as ArtistsTab)
        ? (rawTab as ArtistsTab)
        : "browse"

    const rawSortBy = searchParams.get("sort_by")
    const sortBy: ArtistSortField = VALID_SORT_FIELDS.includes(rawSortBy as ArtistSortField)
        ? (rawSortBy as ArtistSortField)
        : "follower_count"
    const order: "asc" | "desc" = searchParams.get("order") === "asc" ? "asc" : "desc"
    const hasActiveSort = searchParams.has("sort_by") || searchParams.has("order")
    const sort: ArtistSortOptions = { sort_by: sortBy, order }

    const setTab = (next: ArtistsTab) => {
        setSearchParams(
            (prev) => {
                const params = new URLSearchParams(prev)
                if (next === "browse") params.delete("view")
                else params.set("view", next)
                return params
            },
            { replace: true },
        )
    }

    const setSort = (next: { sort_by: ArtistSortField; order: "asc" | "desc" }) => {
        setSearchParams(
            (prev) => {
                const params = new URLSearchParams(prev)
                params.set("sort_by", next.sort_by)
                params.set("order", next.order)
                return params
            },
            { replace: true },
        )
    }

    const viewAllHrefFor = (sectionKey: string) => {
        if (sectionKey === "suggested") return "/artists/suggested"
        const target = SECTION_SORT[sectionKey] ?? { sort_by: "follower_count", order: "desc" }
        return `/artists?sort_by=${target.sort_by}&order=${target.order}`
    }

    const toggleViewAll = () => {
        if (hasActiveSort) navigate("/artists")
        else navigate("/artists?sort_by=follower_count&order=desc")
    }

    useTitle(tab === "browse" ? "Artists" : tab === "following" ? "Following" : "YouTube Artists")

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 250)
        return () => clearTimeout(timer)
    }, [query])

    const isFiltering = query.trim().length > 0
    const showFeatured = tab === "browse" && !isFiltering && !hasActiveSort

    const browse = useArtists({
        ...sort,
        search: debouncedQuery || undefined,
    })
    const featured = useFeaturedArtists(showFeatured)
    const following = useFollowingArtists(
        {
            search: debouncedQuery || undefined,
            source: followingSource === "all" ? undefined : followingSource,
        },
        tab === "following",
    )
    const youtubeLibrary = useArtists(
        { source: "youtube", sort_by: "name", order: "asc" },
        tab === "youtube" && !debouncedQuery,
    )
    const youtube = useYouTubeArtists(debouncedQuery, tab === "youtube")
    const followArtist = useFollowArtist()
    const importYouTube = useImportYouTubeArtist()

    const handleFollow = async (artist: Artist) => {
        await followArtist.mutateAsync(artist.id)
    }

    const handleYouTubeOpen = async (artist: YouTubeArtist) => {
        setImportingChannelId(artist.channel_id)
        try {
            const result = await importYouTube.mutateAsync({
                channel_id: artist.channel_id,
                name: artist.name,
                thumbnail: artist.thumbnail || null,
            })
            navigate(`/artists/${result.slug}`)
        } catch {
            toast.error("Failed to import artist")
        } finally {
            setImportingChannelId(null)
        }
    }

    const handleSuggestedImport = async (artist: Artist) => {
        setImportingChannelId(artist.id)
        try {
            const result = await importYouTube.mutateAsync({
                channel_id: artist.id,
                name: artist.name,
                thumbnail: artist.thumbnail_url,
            })
            navigate(`/artists/${result.slug}`)
        } catch {
            toast.error("Failed to import artist")
        } finally {
            setImportingChannelId(null)
        }
    }

    const visible =
        tab === "following"
            ? (following.data ?? [])
            : (browse.data?.pages.flatMap((page) => page.items) ?? [])
    const youtubeLibraryArtists = youtubeLibrary.data?.pages.flatMap((page) => page.items) ?? []
    const isLoading =
        tab === "following"
            ? following.isLoading
            : tab === "youtube"
              ? youtube.isLoading
              : browse.isLoading

    const emptyState = (
        <div className='flex flex-col items-center gap-6 py-16 text-center'>
            <span className='flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                {tab === "following" ? (
                    <Users className='h-9 w-9 text-red-500' />
                ) : (
                    <Mic2 className='h-9 w-9 text-red-500' />
                )}
            </span>
            <div className='flex flex-col gap-1'>
                <h2 className='text-lg font-semibold dark:text-white'>
                    {isFiltering
                        ? "No artists found"
                        : tab === "following"
                          ? "Not following anyone yet"
                          : "No artists yet"}
                </h2>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                    {isFiltering
                        ? `Nothing matched "${query}". Try a different search.`
                        : tab === "following"
                          ? "Follow artists to see them here"
                          : "Artists appear here once songs are added to your library"}
                </p>
            </div>
        </div>
    )

    return (
        <div className='mx-auto w-full max-w-375 px-4 pt-10 pb-40'>
            <div className='mb-8 flex flex-wrap items-end justify-between gap-4'>
                <div>
                    <h1 className='text-3xl font-bold dark:text-white'>
                        {TAB_LABELS[tab].title} <span className='text-red-500'>Artists</span>
                    </h1>
                    <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                        {TAB_LABELS[tab].subtitle}
                    </p>
                </div>
                <div className='flex items-center gap-3'>
                    <motion.div
                        layout
                        transition={{ layout: { duration: 0.2, ease: "easeOut" } }}
                        className='dark:bg-card flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-white/10'
                    >
                        {VALID_TABS.filter((t) => t !== "youtube" || isAdmin).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                                    tab === t
                                        ? "bg-red-600 text-white"
                                        : "text-gray-600 hover:text-red-500 dark:text-gray-300"
                                }`}
                            >
                                {t === "browse"
                                    ? "Browse"
                                    : t === "following"
                                      ? "Following"
                                      : "YouTube"}
                            </button>
                        ))}
                    </motion.div>
                    <motion.div
                        layout
                        transition={{ layout: { duration: 0.2, ease: "easeOut" } }}
                        className='relative'
                    >
                        <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400' />
                        <input
                            type='text'
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={
                                tab === "youtube"
                                    ? "Search YouTube artists..."
                                    : "Search artists..."
                            }
                            className='dark:bg-card h-11 w-56 rounded-xl border bg-white pr-4 pl-10 text-sm shadow-sm transition-all focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
                        />
                    </motion.div>
                    <motion.div
                        layout
                        transition={{ layout: { duration: 0.2, ease: "easeOut" } }}
                        className={`flex items-center gap-3 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
                            tab === "browse"
                                ? "max-w-[320px] opacity-100"
                                : "pointer-events-none -ml-3 max-w-0 opacity-0"
                        }`}
                    >
                        <motion.button
                            type='button'
                            onClick={toggleViewAll}
                            layout
                            transition={{ layout: { duration: 0.2, ease: "easeOut" } }}
                            className='dark:bg-card flex h-11 cursor-pointer items-center gap-2 rounded-xl border bg-white px-3 text-sm font-medium shadow-sm transition-colors hover:border-red-200 dark:border-white/10 dark:text-white'
                        >
                            <AnimatePresence mode='popLayout' initial={false}>
                                <motion.span
                                    key={hasActiveSort ? "featured" : "view-all"}
                                    className='flex items-center gap-2'
                                    initial={{ opacity: 0, x: hasActiveSort ? -8 : 8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: hasActiveSort ? 8 : -8 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    {hasActiveSort ? (
                                        <LayoutGrid className='h-4 w-4 text-red-500' />
                                    ) : (
                                        <List className='h-4 w-4 text-red-500' />
                                    )}
                                    {hasActiveSort ? "Featured" : "View All Artists"}
                                </motion.span>
                            </AnimatePresence>
                        </motion.button>
                        <SortSelect
                            value={`${sort.sort_by ?? "follower_count"}:${sort.order ?? "desc"}`}
                            onChange={(value) => {
                                const [sort_by, nextOrder] = value.split(":") as [
                                    ArtistSortField,
                                    "asc" | "desc",
                                ]
                                setSort({ sort_by, order: nextOrder })
                            }}
                            options={ARTIST_SORT_OPTIONS}
                        />
                    </motion.div>
                </div>
            </div>

            <AnimatePresence mode='wait'>
                {tab === "youtube" ? (
                    <motion.div key='youtube' {...CONTENT_MOTION}>
                        {!debouncedQuery ? (
                            youtubeLibrary.isLoading ? (
                                <div className='flex justify-center pt-20'>
                                    <Loader2 className='h-12 w-12 animate-spin text-red-600' />
                                </div>
                            ) : youtubeLibraryArtists.length === 0 ? (
                                <div className='flex flex-col items-center gap-6 py-16 text-center'>
                                    <span className='flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                                        <Youtube className='h-9 w-9 text-red-500' />
                                    </span>
                                    <div className='flex flex-col gap-1'>
                                        <h2 className='text-lg font-semibold dark:text-white'>
                                            No YouTube artists yet
                                        </h2>
                                        <p className='text-sm text-gray-500 dark:text-gray-400'>
                                            Search above to find artists on YouTube and import their
                                            channels to browse and play their songs.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p className='mb-4 text-sm text-gray-500 dark:text-gray-400'>
                                        Artists imported from YouTube across the library. Search
                                        above to find and import more.
                                    </p>
                                    <div className='grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                                        {youtubeLibraryArtists.map((artist) => (
                                            <ArtistCard
                                                key={artist.id}
                                                artist={artist}
                                                onFollow={handleFollow}
                                                isFollowing={followArtist.isPending}
                                            />
                                        ))}
                                    </div>
                                    {youtubeLibrary.hasNextPage && (
                                        <div className='mt-10 flex justify-center'>
                                            <button
                                                type='button'
                                                onClick={() => youtubeLibrary.fetchNextPage()}
                                                disabled={youtubeLibrary.isFetchingNextPage}
                                                className='flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-6 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:cursor-wait disabled:opacity-60'
                                            >
                                                {youtubeLibrary.isFetchingNextPage && (
                                                    <Loader2 className='h-4 w-4 animate-spin' />
                                                )}
                                                Load more artists
                                            </button>
                                        </div>
                                    )}
                                </>
                            )
                        ) : isLoading ? (
                            <div className='flex justify-center pt-20'>
                                <Loader2 className='h-12 w-12 animate-spin text-red-600' />
                            </div>
                        ) : (youtube.data?.items ?? []).length === 0 ? (
                            <div className='flex flex-col items-center gap-6 py-16 text-center'>
                                <span className='flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                                    <Search className='h-9 w-9 text-red-500' />
                                </span>
                                <div className='flex flex-col gap-1'>
                                    <h2 className='text-lg font-semibold dark:text-white'>
                                        No artists found
                                    </h2>
                                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                                        Nothing matched "{query}". Try a different search.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className='grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                                {(youtube.data?.items ?? []).map((artist) => (
                                    <YouTubeArtistCard
                                        key={artist.channel_id}
                                        artist={artist}
                                        isImporting={importingChannelId === artist.channel_id}
                                        onOpen={handleYouTubeOpen}
                                    />
                                ))}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div key={tab} {...CONTENT_MOTION}>
                        {tab === "following" && (
                            <div className='mb-6 flex flex-wrap items-center gap-2'>
                                {FOLLOWING_SOURCE_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type='button'
                                        onClick={() => setFollowingSource(option.value)}
                                        className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                                            followingSource === option.value
                                                ? "bg-red-600 text-white"
                                                : "dark:bg-card border border-gray-200 bg-white text-gray-600 hover:text-red-500 dark:border-white/10 dark:text-gray-300"
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        {showFeatured ? (
                            <>
                                {featured.isLoading && (
                                    <div className='flex justify-center pb-10'>
                                        <Loader2 className='h-10 w-10 animate-spin text-red-600' />
                                    </div>
                                )}
                                {(featured.data?.sections ?? []).map((section) => (
                                    <ArtistSection
                                        key={section.key}
                                        title={section.title}
                                        artists={section.items}
                                        onFollow={handleFollow}
                                        isFollowing={followArtist.isPending}
                                        onImport={
                                            section.key === "suggested"
                                                ? handleSuggestedImport
                                                : undefined
                                        }
                                        importingId={
                                            section.key === "suggested"
                                                ? importingChannelId
                                                : undefined
                                        }
                                        viewAllHref={viewAllHrefFor(section.key)}
                                    />
                                ))}
                                {!featured.isLoading &&
                                    (featured.data?.sections ?? []).length === 0 &&
                                    emptyState}
                            </>
                        ) : (
                            <>
                                {isLoading ? (
                                    <div className='flex justify-center pt-20'>
                                        <Loader2 className='h-12 w-12 animate-spin text-red-600' />
                                    </div>
                                ) : visible.length === 0 ? (
                                    emptyState
                                ) : (
                                    <div className='grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                                        {visible.map((artist) => (
                                            <ArtistCard
                                                key={artist.id}
                                                artist={artist}
                                                onFollow={handleFollow}
                                                isFollowing={followArtist.isPending}
                                            />
                                        ))}
                                    </div>
                                )}

                                {tab === "browse" && !isFiltering && browse.hasNextPage && (
                                    <div className='mt-10 flex justify-center'>
                                        <button
                                            type='button'
                                            onClick={() => browse.fetchNextPage()}
                                            disabled={browse.isFetchingNextPage}
                                            className='flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-6 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:cursor-wait disabled:opacity-60'
                                        >
                                            {browse.isFetchingNextPage && (
                                                <Loader2 className='h-4 w-4 animate-spin' />
                                            )}
                                            Load more artists
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
