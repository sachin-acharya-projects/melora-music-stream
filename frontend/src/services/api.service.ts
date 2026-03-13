import { type Song } from "@/types"
import { http } from "@/utils/api/http"

export const apiService = {
    search: async (q: string): Promise<Song[]> => {
        const res = await http.get<Song[]>("/search/", { params: { q } })
        return res.data
    },

    getStreamUrl: async (
        videoId: string,
    ): Promise<{ url: string; title: string; thumbnail: string }> => {
        const res = await http.get<{ url: string; title: string; thumbnail: string }>(
            `/stream/${videoId}`,
        )
        return res.data
    },

    getDownloadUrl: (videoId: string): string => {
        return `${http.defaults.baseURL}/download/${videoId}`
    },
}
