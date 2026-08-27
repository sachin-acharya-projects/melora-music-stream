import Avatar from "@/components/ui/avatar/avatar"
import { useAuth } from "@/hooks/useAuth"
import { useUnreadCount } from "@/hooks/useNotifications"
import { useThemeStore } from "@/hooks/useTheme"
import { usePwaInstall } from "@/hooks/usePwaInstall"
import { Bell, Download, Moon, Music2, Sun } from "lucide-react"
import { Link } from "react-router-dom"

export default function MobileHeader() {
    const mode = useThemeStore((state) => state.mode)
    const toggleTheme = useThemeStore((state) => state.toggleMode)
    const { user } = useAuth()
    const { data: unreadCount = 0 } = useUnreadCount()
    const { canInstall, promptInstall } = usePwaInstall()

    return (
        <header className='fixed inset-x-0 top-0 z-1000 flex h-16 items-center justify-between border-b border-gray-200 bg-white/95 px-4 pt-safe backdrop-blur-md dark:border-white/10 dark:bg-black/95 md:hidden'>
            <Link to='/' className='flex items-center gap-2' title='Melora'>
                <span className='flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white'>
                    <Music2 className='h-5 w-5' />
                </span>
                <span className='text-lg font-bold dark:text-white'>Melora</span>
            </Link>

            <div className='flex items-center gap-2'>
                <Link
                    to='/notifications'
                    className={`relative flex h-10 w-10 items-center justify-center rounded-full bg-black/5 transition-colors hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 ${
                        unreadCount > 0 ? "ring-2 ring-red-400" : ""
                    }`}
                    title='Notifications'
                >
                    <Bell className='h-5 w-5' />
                    {unreadCount > 0 && (
                        <span className='absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white'>
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </Link>
                <button
                    onClick={() => toggleTheme()}
                    className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-black/5 transition-colors hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20'
                    title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                    {mode === "dark" ? <Sun className='h-5 w-5' /> : <Moon className='h-5 w-5' />}
                </button>
                {canInstall && (
                    <button
                        onClick={() => promptInstall()}
                        className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-black/5 transition-colors hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20'
                        title='Install Melora'
                    >
                        <Download className='h-5 w-5' />
                    </button>
                )}
                <Link
                    to='/profile'
                    className='flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700'
                    title='Profile'
                >
                    <Avatar src={user?.avatar_url} name={user?.display_name || user?.username} size={36} />
                </Link>
            </div>
        </header>
    )
}
