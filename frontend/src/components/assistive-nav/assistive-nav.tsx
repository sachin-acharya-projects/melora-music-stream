import { usePwaInstall } from "@/hooks/usePwaInstall"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"
import {
    BarChart3,
    Download,
    History,
    Home,
    ListEnd,
    ListMusic,
    Mic2,
    Music2,
    Radio as RadioIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"

const ITEMS = [
    { to: "/", end: true, label: "Home", icon: Home },
    { to: "/playlists", end: false, label: "Playlists", icon: ListMusic },
    { to: "/artists", end: false, label: "Artists", icon: Mic2 },
    { to: "/radio", end: false, label: "Radio", icon: RadioIcon },
    { to: "/recently-played", end: false, label: "Recently Played", icon: History },
    { to: "/history", end: false, label: "History", icon: History },
    { to: "/stats", end: false, label: "Stats", icon: BarChart3 },
    { to: "/queue", end: false, label: "Queue", icon: ListEnd },
    { to: "/now-playing", end: false, label: "Now Playing", icon: Music2 },
] as const

export default function AssistiveNav() {
    const [open, setOpen] = useState(false)
    const location = useLocation()
    const { canInstall, promptInstall } = usePwaInstall()

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false)
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [])

    return (
        <div className='fixed top-1/2 left-0 z-110 -translate-y-1/2'>
            <button
                onClick={() => setOpen(!open)}
                className='flex h-16 w-6 cursor-pointer items-center justify-center rounded-r-xl border border-l-0 border-gray-200 bg-white/90 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-black/90'
                aria-label='Toggle navigation'
                title='Navigation'
            >
                <div className='flex flex-col gap-1'>
                    <span className='h-1 w-1 rounded-full bg-gray-400' />
                    <span className='h-1 w-1 rounded-full bg-gray-400' />
                    <span className='h-1 w-1 rounded-full bg-gray-400' />
                </div>
            </button>

            <AnimatePresence>
                {open && (
                    <>
                        <div
                            className='fixed inset-0 z-0 cursor-default'
                            onClick={() => setOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ duration: 0.15 }}
                            className='absolute top-1/2 left-7 z-10 flex -translate-y-1/2 flex-col gap-1 rounded-2xl border border-gray-200 bg-white/95 p-2 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-black/95'
                        >
                            {ITEMS.map((item) => {
                                const active = item.end
                                    ? location.pathname === item.to
                                    : location.pathname.startsWith(item.to)
                                const Icon = item.icon
                                return (
                                    <Link
                                        key={item.to}
                                        to={item.to}
                                        onClick={() => setOpen(false)}
                                        className={cn(
                                            "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                                            active
                                                ? "bg-red-500 text-white"
                                                : "text-gray-700 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10",
                                        )}
                                    >
                                        <Icon className='h-4 w-4' />
                                        {item.label}
                                    </Link>
                                )
                            })}
                            {canInstall && (
                                <button
                                    onClick={() => {
                                        setOpen(false)
                                        void promptInstall()
                                    }}
                                    className='flex cursor-pointer items-center gap-3 rounded-xl border-t border-gray-100 px-3 py-2 text-sm font-medium whitespace-nowrap text-gray-700 transition-colors hover:bg-black/5 dark:border-white/5 dark:text-gray-300 dark:hover:bg-white/10'
                                >
                                    <Download className='h-4 w-4' />
                                    Install app
                                </button>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
