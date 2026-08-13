import { cn } from "@/lib/utils"
import { Home, ListMusic, Mic2, Music2, Radio as RadioIcon } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

const TABS = [
    { to: "/", end: true, label: "Home", icon: Home },
    { to: "/playlists", end: false, label: "Playlists", icon: ListMusic },
    { to: "/artists", end: false, label: "Artists", icon: Mic2 },
    { to: "/radio", end: false, label: "Radio", icon: RadioIcon },
    { to: "/now-playing", end: false, label: "Now Playing", icon: Music2 },
] as const

export default function MobileTabBar() {
    const location = useLocation()

    if (location.pathname.startsWith("/admin")) return null

    return (
        <nav className='fixed inset-x-0 bottom-0 z-100 border-t border-gray-200 bg-white/95 pb-safe backdrop-blur-md dark:border-white/10 dark:bg-black/95 md:hidden'>
            <div className='flex items-stretch justify-around'>
                {TABS.map((tab) => {
                    const active = tab.end
                        ? location.pathname === tab.to
                        : location.pathname.startsWith(tab.to)
                    const Icon = tab.icon
                    return (
                        <Link
                            key={tab.to}
                            to={tab.to}
                            className='flex flex-1 cursor-pointer flex-col items-center gap-1 py-2'
                        >
                            <span
                                className={cn(
                                    "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                                    active
                                        ? "bg-red-500 text-white"
                                        : "text-gray-500 dark:text-gray-400",
                                )}
                            >
                                <Icon className='h-5 w-5' />
                            </span>
                            <span
                                className={cn(
                                    "text-[10px] font-medium",
                                    active
                                        ? "text-red-500 dark:text-red-400"
                                        : "text-gray-500 dark:text-gray-400",
                                )}
                            >
                                {tab.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
