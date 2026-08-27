import { API_BASE_URL } from "@/config"
import { http, refreshHttp } from "@/utils/api/http"
import { ENDPOINTS } from "@/utils/api/endpoints"

export interface User {
    id: string
    email: string
    username: string
    display_name: string | null
    avatar_url: string | null
    bio: string | null
    role: string
    is_active: boolean
    is_super_admin: boolean
    oauth_provider: string | null
    favorite_genres: string[]
    privacy_settings: Record<string, unknown>
    created_at: string
    updated_at: string
}

export interface TokenResponse {
    access_token: string
    refresh_token: string
    token_type: string
}

const ACCESS_TOKEN_KEY = "melora_access_token"
const REFRESH_TOKEN_KEY = "melora_refresh_token"
export const AUTH_ERROR_STORAGE_KEY = "melora_auth_error"

export const authService = {
    getAccessToken: (): string | null => {
        return localStorage.getItem(ACCESS_TOKEN_KEY)
    },

    getRefreshToken: (): string | null => {
        return localStorage.getItem(REFRESH_TOKEN_KEY)
    },

    setTokens: (accessToken: string, refreshToken: string) => {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    },

    clearTokens: () => {
        localStorage.removeItem(ACCESS_TOKEN_KEY)
        localStorage.removeItem(REFRESH_TOKEN_KEY)
    },

    loginWithGoogle: () => {
        window.location.href = `${API_BASE_URL}${ENDPOINTS.AUTH.LOGIN}`
    },

    logout: async () => {
        try {
            await http.post(ENDPOINTS.AUTH.LOGOUT)
        } finally {
            authService.clearTokens()
        }
    },

    getCurrentUser: async (): Promise<User> => {
        const { data } = await http.get<User>(ENDPOINTS.AUTH.ME)
        return data
    },

    refreshAccessToken: async (): Promise<TokenResponse> => {
        const refreshToken = authService.getRefreshToken()
        if (!refreshToken) {
            throw new Error("No refresh token")
        }

        const { data } = await refreshHttp.post<TokenResponse>(ENDPOINTS.AUTH.REFRESH, {
            refresh_token: refreshToken,
        })

        authService.setTokens(data.access_token, data.refresh_token)
        return data
    },
}
