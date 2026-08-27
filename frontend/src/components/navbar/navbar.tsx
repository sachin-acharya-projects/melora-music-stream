import Avatar from "@/components/ui/avatar/avatar"
import { BUG_REPORTER_ENABLED } from "@/config"
import { useAuth } from "@/hooks/useAuth"
import { useUnreadCount } from "@/hooks/useNotifications"
import { useQueueStore } from "@/hooks/useQueue"
import { useThemeStore } from "@/hooks/useTheme"
import { usePwaInstall } from "@/hooks/usePwaInstall"
import {
    BarChart3,
    Bell,
    Bug,
    Disc3,
    Download,
    History,
    Home,
    ListEnd,
    ListMusic,
    Mic2,
    Moon,
    Music2,
    Radio as RadioIcon,
    Settings,
    Shield,
    Sun,
    User,
    LogOut,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"

export default function Navbar() {
    const mode = useThemeStore((state) => state.mode)
    const toggleTheme = useThemeStore((state) => state.toggleMode)
    const queue = useQueueStore((state) => state.queue)
    const location = useLocation()
    const { user, logout } = useAuth()
    const [showUserMenu, setShowUserMenu] = useState(false)
    const { canInstall, promptInstall } = usePwaInstall()
    const { data: unreadCount = 0 } = useUnreadCount()

    useEffect(() => {
        if (mode === "dark") {
            document.documentElement.classList.add("dark")
        } else {
            document.documentElement.classList.remove("dark")
        }
    }, [mode])

    return (
        <div className='fixed z-1000 hidden min-h-20 w-full flex-wrap items-center justify-between gap-2 p-3 px-3 shadow-xs backdrop-blur-sm md:flex md:gap-4 md:px-6 dark:border-b dark:border-white/5'>
            <div className='flex flex-1 items-center gap-2'>
                <Link
                    to='/playlists'
                    className={`hidden cursor-pointer items-center gap-2 rounded-full px-4 py-2 transition-colors md:flex ${
                        location.pathname === "/playlists"
                            ? "bg-red-500 text-white"
                            : "hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                    }`}
                >
                    <ListMusic className='h-4 w-4' />
                    <span className='font-medium'>Playlists</span>
                </Link>
                <Link
                    to='/artists'
                    className={`hidden cursor-pointer items-center gap-2 rounded-full px-4 py-2 transition-colors md:flex ${
                        location.pathname.startsWith("/artists")
                            ? "bg-red-500 text-white"
                            : "hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                    }`}
                >
                    <Mic2 className='h-4 w-4' />
                    <span className='font-medium'>Artists</span>
                </Link>
                <Link
                    to='/history'
                    className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 transition-colors ${
                        location.pathname === "/history"
                            ? "bg-red-500 text-white"
                            : "hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                    }`}
                >
                    <History className='h-4 w-4' />
                    <span className='font-medium'>History</span>
                </Link>
                <Link
                    to='/stats'
                    className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 transition-colors ${
                        location.pathname === "/stats"
                            ? "bg-red-500 text-white"
                            : "hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                    }`}
                >
                    <BarChart3 className='h-4 w-4' />
                    <span className='font-medium'>Stats</span>
                </Link>
                <Link
                    to='/radio'
                    className={`hidden cursor-pointer items-center gap-2 rounded-full px-4 py-2 transition-colors md:flex ${
                        location.pathname === "/radio"
                            ? "bg-red-500 text-white"
                            : "hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                    }`}
                >
                    <RadioIcon className='h-4 w-4' />
                    <span className='font-medium'>Radio</span>
                </Link>
                <Link
                    to='/albums'
                    className={`hidden cursor-pointer items-center gap-2 rounded-full px-4 py-2 transition-colors md:flex ${
                        location.pathname.startsWith("/albums")
                            ? "bg-red-500 text-white"
                            : "hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                    }`}
                >
                    <Disc3 className='h-4 w-4' />
                    <span className='font-medium'>My Albums</span>
                </Link>
                <Link
                    to='/now-playing'
                    className={`hidden cursor-pointer items-center gap-2 rounded-full px-4 py-2 transition-colors md:flex ${
                        location.pathname === "/now-playing"
                            ? "bg-red-500 text-white"
                            : "hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                    }`}
                >
                    <Music2 className='h-4 w-4' />
                    <span className='font-medium'>Now Playing</span>
                </Link>
            </div>

            <div className='flex flex-1 justify-center'>
                <Link
                    to='/'
                    className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-full transition-all hover:scale-110 ${
                        location.pathname === "/"
                            ? "bg-red-500 text-white shadow-lg"
                            : "bg-black/5 dark:bg-white/10 dark:text-white"
                    }`}
                    title='Search & Add'
                >
                    <Home className='h-6 w-6' />
                </Link>
            </div>

            <div className='flex flex-1 items-center justify-end gap-4'>
                <Link
                    to='/queue'
                    className={`flex h-13 w-18 cursor-pointer items-center justify-center gap-1 rounded-full bg-black/5 transition-colors hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 ${
                        location.pathname === "/queue" ? "ring-2 ring-red-400" : ""
                    }`}
                    title='Queue videos'
                >
                    <ListEnd className='dark:text-white' />
                    <span className='-mt-3 flex h-full items-end font-bold text-red-500'>
                        {queue.length}
                    </span>
                </Link>
                <Link
                    to='/notifications'
                    className={`relative flex h-13 w-13 cursor-pointer items-center justify-center rounded-full border bg-black/5 transition-colors hover:bg-black/10 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 ${
                        location.pathname.startsWith("/notifications")
                            ? "ring-2 ring-red-400"
                            : ""
                    }`}
                    title='Notifications'
                >
                    <Bell />
                    {unreadCount > 0 && (
                        <span className='absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white'>
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </Link>
                <button
                    onClick={() => toggleTheme()}
                    className='flex h-13 w-13 cursor-pointer items-center justify-center rounded-full border bg-black/5 transition-colors hover:bg-black/10 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20'
                    title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                    {mode === "dark" ? <Sun /> : <Moon />}
                </button>
                {canInstall && (
                    <button
                        onClick={() => promptInstall()}
                        className='flex h-13 w-13 cursor-pointer items-center justify-center rounded-full border bg-black/5 transition-colors hover:bg-black/10 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20'
                        title='Install Melora'
                    >
                        <Download className='h-5 w-5' />
                    </button>
                )}

                {/* User Menu */}
                <div className='relative'>
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className='flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700'
                        title='User menu'
                    >
                        <Avatar
                            src={user?.avatar_url}
                            name={user?.display_name || user?.username}
                            size={40}
                        />
                    </button>

                    {showUserMenu && (
                        <>
                            <div
                                className='fixed inset-0 z-40'
                                onClick={() => setShowUserMenu(false)}
                            />
                            <div className='absolute top-12 right-0 z-50 w-48 rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900'>
                                <div className='border-b border-neutral-200 px-4 py-3 dark:border-neutral-700'>
                                    <p className='text-sm font-medium text-neutral-900 dark:text-white'>
                                        {user?.display_name || user?.username}
                                    </p>
                                    <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                                        {user?.email}
                                    </p>
                                </div>
                                <div className='py-1'>
                                    {user?.role === "admin" && (
                                        <Link
                                            to='/admin'
                                            onClick={() => setShowUserMenu(false)}
                                            className='flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                                        >
                                            <Shield className='h-4 w-4' />
                                            Admin dashboard
                                        </Link>
                                    )}
                                    <Link
                                        to='/profile'
                                        onClick={() => setShowUserMenu(false)}
                                        className='flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                                    >
                                        <User className='h-4 w-4' />
                                        Profile
                                    </Link>
                                    <Link
                                        to='/notifications/settings'
                                        onClick={() => setShowUserMenu(false)}
                                        className='flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                                    >
                                        <Settings className='h-4 w-4' />
                                        Notification settings
                                    </Link>
                                    {BUG_REPORTER_ENABLED && (
                                        <Link
                                            to='/report-bugs'
                                            onClick={() => setShowUserMenu(false)}
                                            className='flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                                        >
                                            <Bug className='h-4 w-4' />
                                            Reported bugs
                                        </Link>
                                    )}
                                    <button
                                        onClick={() => {
                                            setShowUserMenu(false)
                                            logout()
                                        }}
                                        className='flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                                    >
                                        <LogOut className='h-4 w-4' />
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
