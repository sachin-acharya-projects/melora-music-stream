import { type StatsData, type TopSongStat } from "@/types"
import { ENDPOINTS } from "@/utils/api/endpoints"
import { http } from "@/utils/api/http"

export const statsService = {
    get: async (): Promise<StatsData> => {
        const { data } = await http.get<StatsData>(ENDPOINTS.STATS.BASE)
        return data
    },

    getTopSongs: async (limit: number = 10): Promise<TopSongStat[]> => {
        const { data } = await http.get<TopSongStat[]>(ENDPOINTS.STATS.TOP_SONGS, {
            params: { limit },
        })
        return data
    },

    recalculate: async (): Promise<StatsData> => {
        const { data } = await http.post<StatsData>(ENDPOINTS.STATS.RECALCULATE)
        return data
    },
}
