import {
    useDiscoverPlaylists,
    useFollowPlaylist,
    useFollowingPlaylists,
    usePlaylists,
} from "@/hooks/usePlaylists"
import { useTitle } from "@/hooks/useTitle"
import { type PlaylistSortOptions } from "@/services/playlist.service"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { PlaylistCollection } from "./playlists/playlist-collection"
import { PlaylistDetail } from "./playlists/playlist-detail"

export type PlaylistsTab = "mine" | "discover" | "following"

const VALID_TABS: PlaylistsTab[] = ["mine", "discover", "following"]

export default function Playlists() {
    const [searchParams, setSearchParams] = useSearchParams()
    const [playlistSort, setPlaylistSort] = useState<PlaylistSortOptions>({
        sort_by: "created_at",
        order: "desc",
    })
    const [query, setQuery] = useState("")
    const [debouncedQuery, setDebouncedQuery] = useState("")
    const rawTab = searchParams.get("view")
    const tab: PlaylistsTab = VALID_TABS.includes(rawTab as PlaylistsTab)
        ? (rawTab as PlaylistsTab)
        : "mine"
    const setTab = (next: PlaylistsTab) => {
        setSearchParams(
            (prev) => {
                const params = new URLSearchParams(prev)
                if (next === "mine") params.delete("view")
                else params.set("view", next)
                return params
            },
            { replace: true },
        )
    }
    useTitle(tab === "mine" ? "My Playlists" : tab === "discover" ? "Discover" : "Following")
    const { playlists, isLoading } = usePlaylists({
        ...playlistSort,
        q: debouncedQuery || undefined,
    })
    const discover = useDiscoverPlaylists(50, tab === "discover", debouncedQuery || undefined)
    const following = useFollowingPlaylists(tab === "following", debouncedQuery || undefined)
    const followPlaylist = useFollowPlaylist()

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 250)
        return () => clearTimeout(timer)
    }, [query])

    const activePlaylistId = searchParams.get("playlist")
    const activePlaylist =
        playlists.find((p) => p.id === activePlaylistId) ??
        discover.data?.find((p) => p.id === activePlaylistId) ??
        following.data?.find((p) => p.id === activePlaylistId)

    if (isLoading || discover.isLoading || following.isLoading) {
        return (
            <div className='flex justify-center pt-20'>
                <Loader2 className='h-12 w-12 animate-spin text-red-600' />
            </div>
        )
    }

    if (activePlaylistId && activePlaylist) {
        return <PlaylistDetail key={activePlaylistId} playlistId={activePlaylistId} />
    }

    const visible =
        tab === "discover"
            ? (discover.data ?? [])
            : tab === "following"
              ? (following.data ?? [])
              : playlists

    return (
        <PlaylistCollection
            view={tab}
            onTabChange={setTab}
            playlists={visible}
            sort={playlistSort}
            onSortChange={setPlaylistSort}
            search={query}
            onSearchChange={setQuery}
            onFollow={followPlaylist.mutateAsync}
            isFollowing={followPlaylist.isPending}
        />
    )
}
