import {
    useDiscoverPlaylists,
    useFollowPlaylist,
    useFollowingPlaylists,
    usePlaylists,
} from "@/hooks/usePlaylists"
import { useTitle } from "@/hooks/useTitle"
import { type PlaylistSortOptions } from "@/services/playlist.service"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { PlaylistCollection } from "./playlists/playlist-collection"
import { PlaylistDetail } from "./playlists/playlist-detail"

export type PlaylistsTab = "mine" | "discover" | "following"

export default function Playlists() {
    useTitle("My Playlists")
    const [searchParams] = useSearchParams()
    const [playlistSort, setPlaylistSort] = useState<PlaylistSortOptions>({
        sort_by: "created_at",
        order: "desc",
    })
    const [tab, setTab] = useState<PlaylistsTab>("mine")
    const { playlists, isLoading } = usePlaylists(playlistSort)
    const discover = useDiscoverPlaylists()
    const following = useFollowingPlaylists()
    const followPlaylist = useFollowPlaylist()

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
            onFollow={followPlaylist.mutateAsync}
            isFollowing={followPlaylist.isPending}
        />
    )
}
