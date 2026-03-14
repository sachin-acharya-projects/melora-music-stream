import { apiService } from "@/services/api.service"
import { useQuery } from "@tanstack/react-query"

export function useStreaming(videoId: string | undefined) {
    return useQuery({
        queryKey: ["stream", videoId],
        queryFn: () => (videoId ? apiService.getStreamUrl(videoId) : null),
        enabled: !!videoId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}
