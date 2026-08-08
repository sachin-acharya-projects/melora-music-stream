import { type StatsData } from "@/types"
import { ENDPOINTS } from "@/utils/api/endpoints"
import { http } from "@/utils/api/http"

export const statsService = {
    get: async (): Promise<StatsData> => {
        const { data } = await http.get<StatsData>(ENDPOINTS.STATS.BASE)
        return data
    },

    recalculate: async (): Promise<StatsData> => {
        const { data } = await http.post<StatsData>(ENDPOINTS.STATS.RECALCULATE)
        return data
    },
}
