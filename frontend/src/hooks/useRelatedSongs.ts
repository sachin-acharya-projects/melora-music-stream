import { apiService } from "@/services/api.service"
import { type Song } from "@/types"
import { API_LIMITS } from "@/utils/constants"
import { useQuery } from "@tanstack/react-query"

export function useRelatedSongs(songId: string | null, limit: number = API_LIMITS.RELATED_SONGS) {
    return useQuery({
        queryKey: ["related-songs", songId, limit],
        queryFn: () => (songId ? apiService.getRelatedSongs(songId, limit) : []),
        enabled: !!songId,
        placeholderData: (prev) => prev as Song[] | undefined,
    })
}
