import { usePlaylists } from "@/hooks/usePlaylists"
import { useTitle } from "@/hooks/useTitle"
import { type PlaylistSortOptions } from "@/services/playlist.service"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { PlaylistCollection } from "./playlists/playlist-collection"
import { PlaylistDetail } from "./playlists/playlist-detail"

export default function Playlists() {
    useTitle("My Playlists")
    const [searchParams] = useSearchParams()
    const [playlistSort, setPlaylistSort] = useState<PlaylistSortOptions>({
        sort_by: "created_at",
        order: "desc",
    })
    const { playlists, isLoading } = usePlaylists(playlistSort)

    const activePlaylistId = searchParams.get("playlist")
    const activePlaylist = playlists.find((p) => p.id === activePlaylistId)

    if (isLoading) {
        return (
            <div className='flex justify-center pt-20'>
                <Loader2 className='h-12 w-12 animate-spin text-red-600' />
            </div>
        )
    }

    if (activePlaylistId && activePlaylist) {
        return <PlaylistDetail key={activePlaylistId} playlistId={activePlaylistId} />
    }

    return (
        <PlaylistCollection
            playlists={playlists}
            sort={playlistSort}
            onSortChange={setPlaylistSort}
        />
    )
}
