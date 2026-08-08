import { createContext, useEffect, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { usePlayerStore } from "@/hooks/usePlayer"
import { authService, type User } from "@/services/auth.service"

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
            // Check for tokens in URL (OAuth callback)
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
