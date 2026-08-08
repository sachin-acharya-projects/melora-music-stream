import { apiService } from "@/services/api.service"
import { useQuery } from "@tanstack/react-query"

export function useLyrics(songId: string | null) {
    return useQuery({
        queryKey: ["lyrics", songId],
        queryFn: () => (songId ? apiService.getLyrics(songId) : null),
        enabled: !!songId,
        staleTime: Infinity,
    })
}
