import { AuthProvider } from "@/contexts/AuthContext"
import { useAuth } from "@/hooks/useAuth"
import { usePlayerStore } from "@/hooks/usePlayer"
import MobileTabBar from "@/components/mobile-nav/mobile-tab-bar"
import MobileHeader from "@/components/mobile-nav/mobile-header"
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
import RecentlyPlayed from "@/pages/RecentlyPlayed"
import Notifications from "@/pages/Notifications"
import NotificationSettings from "@/pages/NotificationSettings"
import Recommendations from "@/pages/Recommendations"
import Stats from "@/pages/Stats"
import MyAlbums from "@/pages/MyAlbums"
import AlbumDetail from "@/pages/AlbumDetail"
import AdminDashboard from "@/pages/admin/AdminDashboard"
import AdminArtists from "@/pages/admin/AdminArtists"
import AdminSongs from "@/pages/admin/AdminSongs"
import AdminUsers from "@/pages/admin/AdminUsers"
import AdminBugs from "@/pages/admin/AdminBugs"
import ReportedBugs from "@/pages/ReportedBugs"
import AdminRoute from "@/components/admin/admin-route"
import { BUG_REPORTER_ENABLED, API_BASE_URL } from "@/config"
import { authService } from "@/services/auth.service"
import { getFailedNetworkRequests } from "@/utils/api/http"
import { BugReporter } from "@sachin-acharya-projects/bug-reporter"
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
    const currentSong = usePlayerStore((s) => s.currentSong)
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
                {isAuthenticated && <MobileHeader />}
                {isAuthenticated && <MobileTabBar />}
                <Background />
                <main
                    className={
                        isAuthenticated
                            ? currentSong
                                ? "pt-safe-overlay pb-44 md:pb-0"
                                : "pt-safe-overlay pb-24 md:pb-0"
                            : ""
                    }
                >
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
                        path='/albums'
                        element={
                            <ProtectedRoute>
                                <MyAlbums />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/albums/:browseId'
                        element={
                            <ProtectedRoute>
                                <AlbumDetail />
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
                        path='/recently-played'
                        element={
                            <ProtectedRoute>
                                <RecentlyPlayed />
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
                    {BUG_REPORTER_ENABLED && (
                        <Route
                            path='/report-bugs'
                            element={
                                <ProtectedRoute>
                                    <ReportedBugs />
                                </ProtectedRoute>
                            }
                        />
                    )}
                    <Route
                        path='/admin'
                        element={
                            <AdminRoute>
                                <AdminDashboard />
                            </AdminRoute>
                        }
                    />
                    <Route
                        path='/admin/artists'
                        element={
                            <AdminRoute>
                                <AdminArtists />
                            </AdminRoute>
                        }
                    />
                    <Route
                        path='/admin/songs'
                        element={
                            <AdminRoute>
                                <AdminSongs />
                            </AdminRoute>
                        }
                    />
                    <Route
                        path='/admin/users'
                        element={
                            <AdminRoute>
                                <AdminUsers />
                            </AdminRoute>
                        }
                    />
                    {BUG_REPORTER_ENABLED && (
                        <Route
                            path='/admin/bugs'
                            element={
                                <AdminRoute>
                                    <AdminBugs />
                                </AdminRoute>
                            }
                        />
                    )}
                    <Route path='*' element={<Navigate to='/' replace />} />
                </Routes>
            </main>
            {isAuthenticated && <AudioPlayer />}
            {isAuthenticated && BUG_REPORTER_ENABLED && (
                <BugReporter
                    config={{
                        apiBaseUrl: API_BASE_URL,
                        getAuthHeaders: () => ({
                            Authorization: `Bearer ${authService.getAccessToken()}`,
                        }),
                        getNetworkContext: () => ({
                            failed_requests: getFailedNetworkRequests(),
                        }),
                    }}
                />
            )}
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
