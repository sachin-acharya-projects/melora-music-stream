import { apiService } from "@/services/api.service"
import { type Song } from "@/types"
import { useQuery } from "@tanstack/react-query"

export function useRelatedSongs(songId: string | null, limit = 6) {
    return useQuery({
        queryKey: ["related-songs", songId, limit],
        queryFn: () => (songId ? apiService.getRelatedSongs(songId, limit) : []),
        enabled: !!songId,
        placeholderData: (prev) => prev as Song[] | undefined,
    })
}
