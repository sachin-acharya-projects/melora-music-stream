import { AuthProvider } from "@/contexts/AuthContext"
import { useAuth } from "@/hooks/useAuth"
import { usePlayerStore } from "@/hooks/usePlayer"
import Home from "@/pages/Home"
import Login from "@/pages/Login"
import AuthCallback from "@/pages/AuthCallback"
import NowPlaying from "@/pages/NowPlaying"
import Playlists from "@/pages/Playlists"
import Profile from "@/pages/Profile"
import Queue from "@/pages/Queue"
import SharedPlaylist from "@/pages/SharedPlaylist"
import Radio from "@/pages/Radio"
import Artists from "@/pages/Artists"
import ArtistAlbum from "@/pages/ArtistAlbum"
import ArtistProfile from "@/pages/ArtistProfile"
import ArtistRecentlyPlayed from "@/pages/ArtistRecentlyPlayed"
import ArtistsSuggested from "@/pages/ArtistsSuggested"
import History from "@/pages/History"
import Notifications from "@/pages/Notifications"
import NotificationSettings from "@/pages/NotificationSettings"
import Recommendations from "@/pages/Recommendations"
import Stats from "@/pages/Stats"
import { useEffect } from "react"
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import AudioPlayer from "../audio-player/audio-player"
import Background from "../background/background"
import Navbar from "../navbar/navbar"
import { Loader2 } from "lucide-react"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth()

    if (isLoading) {
        return (
            <div className='flex min-h-screen items-center justify-center'>
                <Loader2 className='h-8 w-8 animate-spin text-red-500' />
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to='/login' replace />
    }

    return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth()

    if (isLoading) {
        return (
            <div className='flex min-h-screen items-center justify-center'>
                <Loader2 className='h-8 w-8 animate-spin text-red-500' />
            </div>
        )
    }

    if (isAuthenticated) {
        return <Navigate to='/' replace />
    }

    return <>{children}</>
}

function AppContent() {
    const initialize = usePlayerStore((s) => s.initialize)
    const { isAuthenticated, isLoading } = useAuth()

    useEffect(() => {
        if (isAuthenticated) {
            initialize()
        }
    }, [initialize, isAuthenticated])

    if (isLoading) {
        return (
            <div className='flex min-h-screen items-center justify-center'>
                <Loader2 className='h-8 w-8 animate-spin text-red-500' />
            </div>
        )
    }

    return (
        <section>
            {isAuthenticated && <Navbar />}
            <Background />
            <main className={isAuthenticated ? "pt-22" : ""}>
                <Routes>
                    <Route
                        path='/login'
                        element={
                            <PublicOnlyRoute>
                                <Login />
                            </PublicOnlyRoute>
                        }
                    />
                    <Route path='/auth/callback' element={<AuthCallback />} />
                    <Route path='/s/:token' element={<SharedPlaylist />} />
                    <Route
                        path='/'
                        element={
                            <ProtectedRoute>
                                <Home />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/playlists'
                        element={
                            <ProtectedRoute>
                                <Playlists />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/artists'
                        element={
                            <ProtectedRoute>
                                <Artists />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/artists/suggested'
                        element={
                            <ProtectedRoute>
                                <ArtistsSuggested />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/artists/:slug'
                        element={
                            <ProtectedRoute>
                                <ArtistProfile />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/artists/:slug/recently-played'
                        element={
                            <ProtectedRoute>
                                <ArtistRecentlyPlayed />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/artists/:slug/album/:albumKey'
                        element={
                            <ProtectedRoute>
                                <ArtistAlbum />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/recommendations'
                        element={
                            <ProtectedRoute>
                                <Recommendations />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/history'
                        element={
                            <ProtectedRoute>
                                <History />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/stats'
                        element={
                            <ProtectedRoute>
                                <Stats />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/radio'
                        element={
                            <ProtectedRoute>
                                <Radio />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/queue'
                        element={
                            <ProtectedRoute>
                                <Queue />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/now-playing'
                        element={
                            <ProtectedRoute>
                                <NowPlaying />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/profile'
                        element={
                            <ProtectedRoute>
                                <Profile />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/notifications'
                        element={
                            <ProtectedRoute>
                                <Notifications />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/notifications/settings'
                        element={
                            <ProtectedRoute>
                                <NotificationSettings />
                            </ProtectedRoute>
                        }
                    />
                    <Route path='*' element={<Navigate to='/' replace />} />
                </Routes>
            </main>
            {isAuthenticated && <AudioPlayer />}
            <ToastContainer
                position='bottom-right'
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme='light'
            />
        </section>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </BrowserRouter>
    )
}
