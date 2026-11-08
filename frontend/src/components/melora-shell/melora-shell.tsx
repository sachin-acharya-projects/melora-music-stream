import type { ReactNode } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
    AudioLines, Disc3, History, Home, ListMusic, Mic2, Radio,
    Search, Settings2, Sparkles,
} from "lucide-react"
import NowPlayingPanel from "./now-playing-panel"

type Props = { children: ReactNode; enabled?: boolean }

const pageLinks = [
    { to: "/", label: "Discover", icon: Home, end: true },
    { to: "/artists", label: "Artists", icon: Mic2 },
    { to: "/albums", label: "Albums", icon: Disc3 },
    { to: "/playlists", label: "Playlists", icon: ListMusic },
    { to: "/recently-played", label: "Recent", icon: History },
    { to: "/recommendations", label: "For you", icon: Sparkles },
    { to: "/radio", label: "Radio", icon: Radio },
]

function PageNavigation() {
    return (
        <nav aria-label="Main navigation" className="flex items-center gap-1 overflow-x-auto">
            {pageLinks.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                        `flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                            isActive
                                ? "bg-[#202a3d] text-white"
                                : "text-[#737d8d] hover:bg-[#f0f2f5] hover:text-[#202a3d]"
                        }`
                    }
                >
                    <Icon size={15} strokeWidth={1.8} />
                    {label}
                </NavLink>
            ))}
        </nav>
    )
}

export default function MeloraShell({ children, enabled = true }: Props) {
    const location = useLocation()
    if (!enabled) return <>{children}</>

    const title = location.pathname === "/" ? "Discover" :
        location.pathname.startsWith("/artists") ? "Artists" :
        location.pathname.startsWith("/albums") ? "Albums" :
        location.pathname.startsWith("/playlists") ? "Playlists" :
        location.pathname === "/queue" ? "Queue" :
        location.pathname === "/now-playing" ? "Now Playing" :
        location.pathname === "/history" ? "Listening history" :
        location.pathname === "/recently-played" ? "Recently played" :
        location.pathname === "/profile" ? "Settings & profile" : "Your music"

    return (
        <div className="melora-app min-h-screen bg-white text-[#171d29] lg:flex">
            <NowPlayingPanel />

            <section className="flex min-h-screen min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-20 border-b border-[#eceef2] bg-white/95 px-5 py-4 backdrop-blur-xl md:px-8">
                    <div className="flex items-center justify-between gap-4">
                        <NavLink to="/" className="flex shrink-0 items-center gap-2.5 lg:hidden">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#202a3d] text-white">
                                <AudioLines size={19} />
                            </span>
                            <span className="text-lg font-extrabold tracking-[-0.7px]">melora</span>
                        </NavLink>
                        <div className="hidden min-w-0 lg:block">
                            <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#a0a7b2]">Your music, your space</p>
                            <h1 className="mt-0.5 text-xl font-extrabold tracking-[-0.6px]">{title}</h1>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <NavLink
                                to="/"
                                aria-label="Search music"
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f6] text-[#596273] transition hover:bg-[#e9ecf1]"
                            >
                                <Search size={18} />
                            </NavLink>
                            <NavLink
                                to="/profile"
                                aria-label="Settings and profile"
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f6] text-[#596273] transition hover:bg-[#e9ecf1]"
                            >
                                <Settings2 size={18} />
                            </NavLink>
                        </div>
                    </div>
                    <div className="mt-4">
                        <PageNavigation />
                    </div>
                    <h1 className="mt-4 text-lg font-extrabold tracking-[-0.5px] lg:hidden">{title}</h1>
                </header>

                <main className="melora-content mx-auto w-full max-w-[1600px] flex-1 px-5 pb-12 pt-6 md:px-8 md:pt-8">
                    {children}
                </main>
            </section>
        </div>
    )
}
