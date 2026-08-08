import { historyService } from "@/services/history.service"
import { type Song } from "@/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-toastify"

export function useHistory(options: { page?: number; page_size?: number } = {}) {
    return useQuery({
        queryKey: ["history", options],
        queryFn: () => historyService.getAll(options),
    })
}

export function useRecordListen() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ song, playDuration }: { song: Song; playDuration?: number }) =>
            historyService.record(song, playDuration),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["history"] })
            queryClient.invalidateQueries({ queryKey: ["stats"] })
            queryClient.invalidateQueries({ queryKey: ["artist"] })
        },
        onError: () => toast.error("Failed to record listen"),
    })
}

export function useUpdatePlayDuration() {
    return useMutation({
        mutationFn: ({ entryId, playDuration }: { entryId: string; playDuration: number }) =>
            historyService.updateDuration(entryId, playDuration),
        onError: () => toast.error("Failed to update listen"),
    })
}
