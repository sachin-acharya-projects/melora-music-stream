import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"
import { API_BASE_URL } from "@/config"
import { authService, AUTH_ERROR_STORAGE_KEY, type TokenResponse } from "@/services/auth.service"
import { ENDPOINTS } from "@/utils/api/endpoints"
import { MESSAGES } from "@/utils/messages"
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

function isDeactivatedError(error: AxiosError): boolean {
    return (
        error.response?.status === 403 &&
        (error.response.data as { detail?: string } | undefined)?.detail ===
            MESSAGES.ACCOUNT_DEACTIVATED
    )
}

function handleAccountDeactivated(): void {
    authService.clearTokens()
    sessionStorage.setItem(AUTH_ERROR_STORAGE_KEY, MESSAGES.ACCOUNT_DEACTIVATED)
    if (window.location.pathname !== "/login") {
        window.location.href = "/login"
    }
}

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
        if (isDeactivatedError(error)) {
            handleAccountDeactivated()
            return Promise.reject(error)
        }

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
        } catch (refreshError) {
            // Refresh failed - tokens are invalid, clear them and bail out
            authService.clearTokens()
            if (isDeactivatedError(refreshError as AxiosError)) {
                handleAccountDeactivated()
            }
            return Promise.reject(error)
        }
    },
)
