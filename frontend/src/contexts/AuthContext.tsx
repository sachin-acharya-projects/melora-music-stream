import { createContext, useEffect, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { Capacitor, type PluginListenerHandle } from "@capacitor/core"
import { App } from "@capacitor/app"
import { usePlayerStore } from "@/hooks/usePlayer"
import { authService, type User, MOBILE_OAUTH_DEEPLINK } from "@/services/auth.service"
import { MESSAGES } from "@/utils/messages"

interface AuthContextType {
    user: User | null
    isLoading: boolean
    isAuthenticated: boolean
    login: () => void
    logout: () => void
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const navigate = useNavigate()

    const refreshUser = async () => {
        try {
            const currentUser = await authService.getCurrentUser()
            setUser(currentUser)
        } catch {
            setUser(null)
        }
    }

    useEffect(() => {
        const initAuth = async () => {
            // Check for tokens in URL (OAuth callback on web)
            const params = new URLSearchParams(window.location.search)
            const accessToken = params.get("access_token")
            const refreshToken = params.get("refresh_token")

            if (accessToken && refreshToken) {
                authService.setTokens(accessToken, refreshToken)
                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname)
                await refreshUser()
                toast.success("Logged in successfully!")
            } else if (authService.getAccessToken()) {
                await refreshUser()
            }
            setIsLoading(false)
        }

        initAuth()
    }, [])

    // On mobile the OAuth consent runs in the system browser and returns via a
    // deep link (com.melora.app://auth/callback?...). Capture it and store the
    // tokens.
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return
        let listener: PluginListenerHandle | undefined
        const handleAppUrlOpen = async (data: { url: string }) => {
            const url = data.url
            if (!url.startsWith(MOBILE_OAUTH_DEEPLINK)) return
            const params = new URLSearchParams(url.split("?")[1] ?? "")
            const errorParam = params.get("error")
            if (errorParam === "account_deactivated") {
                toast.error(MESSAGES.ACCOUNT_DEACTIVATED)
                navigate("/login")
                return
            }
            const accessToken = params.get("access_token")
            const refreshToken = params.get("refresh_token")
            if (accessToken && refreshToken) {
                authService.setTokens(accessToken, refreshToken)
                await refreshUser()
                toast.success("Logged in successfully!")
                navigate("/")
            }
        }
        App.addListener("appUrlOpen", handleAppUrlOpen).then((l) => {
            listener = l
        })
        return () => {
            listener?.remove()
        }
    }, [navigate, refreshUser])

    const login = () => {
        authService.loginWithGoogle()
    }

    const logout = () => {
        authService.logout()
        usePlayerStore.getState().reset()
        setUser(null)
        navigate("/")
        toast.info("Logged out")
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export { AuthContext }
