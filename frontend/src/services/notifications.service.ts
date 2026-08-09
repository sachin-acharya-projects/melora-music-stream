import {
    type NotificationEventSettings,
    type NotificationListResponse,
} from "@/types"
import { ENDPOINTS } from "@/utils/api/endpoints"
import { http } from "@/utils/api/http"

export const notificationsService = {
    list: async (limit: number = 20, offset: number = 0): Promise<NotificationListResponse> => {
        const { data } = await http.get<NotificationListResponse>(ENDPOINTS.NOTIFICATIONS.BASE, {
            params: { limit, offset },
        })
        return data
    },

    unreadCount: async (): Promise<number> => {
        const { data } = await http.get<{ unread_count: number }>(
            ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT,
        )
        return data.unread_count
    },

    markRead: async (id: string): Promise<void> => {
        await http.post(ENDPOINTS.NOTIFICATIONS.READ(id))
    },

    markAllRead: async (): Promise<number> => {
        const { data } = await http.post<{ updated: number }>(
            ENDPOINTS.NOTIFICATIONS.READ_ALL,
        )
        return data.updated
    },

    getSettings: async (): Promise<NotificationEventSettings> => {
        const { data } = await http.get<NotificationEventSettings>(
            ENDPOINTS.NOTIFICATIONS.SETTINGS,
        )
        return data
    },

    updateSettings: async (
        settings: Partial<Record<string, Partial<Record<string, boolean>>>>,
    ): Promise<NotificationEventSettings> => {
        const { data } = await http.patch<NotificationEventSettings>(
            ENDPOINTS.NOTIFICATIONS.SETTINGS,
            settings,
        )
        return data
    },
}
