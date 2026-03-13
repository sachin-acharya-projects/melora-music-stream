import { useQueueStore } from "@/hooks/useQueue"
import { useThemeStore } from "@/hooks/useTheme"
import { ListMusic, Moon, Music2, Plus, ShoppingCart, Sun } from "lucide-react"
import { useEffect } from "react"
import { Link, useLocation } from "react-router-dom"

export default function Navbar() {
    const mode = useThemeStore((state) => state.mode)
    const toggleTheme = useThemeStore((state) => state.toggleMode)
    const queue = useQueueStore((state) => state.queue)
    const location = useLocation()

    useEffect(() => {
        if (mode === "dark") {
            document.documentElement.classList.add("dark")
        } else {
            document.documentElement.classList.remove("dark")
        }
    }, [mode])

    return (
        <div className='fixed z-1000 flex h-20 w-full items-center justify-between gap-4 bg-white/5 p-3 px-6 shadow-xs backdrop-blur-sm dark:border-b dark:border-white/5'>
            <div className='flex flex-1 items-center gap-2'>
                <Link
                    to='/playlists'
                    className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 transition-colors ${
                        location.pathname === "/playlists"
                            ? "bg-red-500 text-white"
                            : "hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                    }`}
                >
                    <ListMusic className='h-4 w-4' />
                    <span className='font-medium'>Playlists</span>
                </Link>
                <Link
                    to='/now-playing'
                    className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 transition-colors ${
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
                    <Plus className='h-6 w-6' />
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
                    <ShoppingCart className='dark:text-white' />
                    <span className='-mt-3 flex h-full items-end font-bold text-red-500'>
                        {queue.length}
                    </span>
                </Link>
                <button
                    onClick={() => toggleTheme()}
                    className='flex h-13 w-13 cursor-pointer items-center justify-center rounded-full border bg-black/5 transition-colors hover:bg-black/10 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20'
                    title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                    {mode === "dark" ? <Sun /> : <Moon />}
                </button>
            </div>
        </div>
    )
}
