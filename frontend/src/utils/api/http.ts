import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"
import { API_BASE_URL } from "@/config"
import { authService, type TokenResponse } from "@/services/auth.service"
import { ENDPOINTS } from "@/utils/api/endpoints"
import { rewriteThumbnails } from "@/utils/thumbnail"

export const http = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
})

// Dedicated instance for token refresh - bypasses the response interceptor to
// prevent infinite refresh loops when the refresh endpoint itself returns 401.
export const refreshHttp = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
})

let refreshPromise: Promise<string> | null = null

async function refreshToken(): Promise<string> {
    const refreshToken = authService.getRefreshToken()
    if (!refreshToken) {
        throw new Error("No refresh token")
    }

    const { data } = await refreshHttp.post<TokenResponse>(ENDPOINTS.AUTH.REFRESH, {
        refresh_token: refreshToken,
    })

    authService.setTokens(data.access_token, data.refresh_token)
    return data.access_token
}

// Request interceptor - add auth token
http.interceptors.request.use(
    (config) => {
        const token = authService.getAccessToken()
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    },
)

// Response interceptor - rewrite thumbnail URLs to the backend proxy
http.interceptors.response.use(
    (response) => {
        response.data = rewriteThumbnails(response.data)
        return response
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean
        }

        if (
            error.response?.status !== 401 ||
            !originalRequest ||
            originalRequest._retry ||
            !authService.getRefreshToken()
        ) {
            return Promise.reject(error)
        }

        originalRequest._retry = true

        try {
            // Share a single in-flight refresh across concurrent 401s so the
            // refresh endpoint is only hit once per batch.
            refreshPromise =
                refreshPromise ??
                refreshToken().finally(() => {
                    refreshPromise = null
                })
            const newToken = await refreshPromise
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return http(originalRequest)
        } catch {
            // Refresh failed - tokens are invalid, clear them and bail out
            authService.clearTokens()
            return Promise.reject(error)
        }
    },
)
