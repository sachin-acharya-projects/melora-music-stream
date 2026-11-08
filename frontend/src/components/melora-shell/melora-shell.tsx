import type { ReactNode } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
    AudioLines, Compass, Disc3, Heart, History, Home, Library,
    ListMusic, Mic2, Radio, Search, Settings2, Sparkles, Users,
} from "lucide-react"

type Props = { children: ReactNode; enabled?: boolean }

const primaryLinks = [
    { to: "/", label: "Home", icon: Home, end: true },
    { to: "/artists", label: "Artists", icon: Mic2 },
    { to: "/albums", label: "Albums", icon: Disc3 },
    { to: "/playlists", label: "Playlists", icon: ListMusic },
]
const libraryLinks = [
    { to: "/recently-played", label: "Recently played", icon: History },
    { to: "/history", label: "Listening history", icon: AudioLines },
    { to: "/recommendations", label: "Made for you", icon: Sparkles },
    { to: "/radio", label: "Radio", icon: Radio },
]

function NavigationLink({ to, label, icon: Icon, end }: {
    to: string; label: string; icon: typeof Home; end?: boolean
}) {
    return (
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
                `group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors ${
                    isActive
                        ? "bg-[#111827] text-white shadow-sm"
                        : "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]"
                }`
            }
        >
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
            <span>{label}</span>
        </NavLink>
    )
}

export default function MeloraShell({ children, enabled = true }: Props) {\n    if (!enabled) return <>{children}</>
    const location = useLocation()
    const title = location.pathname === "/" ? "Discover" :
        location.pathname.startsWith("/artists") ? "Artists" :
        location.pathname.startsWith("/albums") ? "Albums" :
        location.pathname.startsWith("/playlists") ? "Playlists" :
        location.pathname === "/queue" ? "Queue" :
        location.pathname === "/now-playing" ? "Now playing" :
        location.pathname === "/history" ? "History" :
        location.pathname === "/recently-played" ? "Recently played" : "Your music"

    return (
        <div className="melora-app min-h-screen bg-white text-[#111827]">
            <aside className="melora-sidebar fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-[#f0f1f3] bg-white px-5 py-7 lg:flex">
                <NavLink to="/" className="mb-10 flex items-center gap-3 px-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#111827] text-white">
                        <AudioLines className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <span className="text-[21px] font-extrabold tracking-[-0.8px]">melora</span>
                </NavLink>

                <div className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[1.2px] text-[#9ca3af]">Menu</div>
                <nav className="flex flex-col gap-1">
                    {primaryLinks.map((item) => <NavigationLink key={item.to} {...item} />)}
                </nav>

                <div className="mb-3 mt-9 px-3 text-[11px] font-bold uppercase tracking-[1.2px] text-[#9ca3af]">Your library</div>
                <nav className="flex flex-col gap-1">
                    {libraryLinks.map((item) => <NavigationLink key={item.to} {...item} />)}
                    <NavigationLink to="/queue" label="Up next" icon={Library} />
                </nav>

                <div className="mt-auto rounded-2xl bg-[#f9fafb] p-4">
                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#111827]">
                        <Heart className="h-[17px] w-[17px]" />
                    </div>
                    <p className="text-sm font-bold">Your sound, your space</p>
                    <p className="mt-1 text-xs leading-5 text-[#6b7280]">A home for the music you love.</p>
                </div>
                <NavLink to="/profile" className="mt-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#6b7280] hover:bg-[#f3f4f6]">
                    <Settings2 className="h-[18px] w-[18px]" /> Settings & profile
                </NavLink>
            </aside>

            <div className="min-h-screen lg:pl-[248px]">
                <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#f0f1f3] bg-white/95 px-5 backdrop-blur md:px-10">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[1.3px] text-[#9ca3af]">Good music lives here</p>
                        <h1 className="mt-0.5 text-[20px] font-extrabold tracking-[-0.6px]">{title}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <NavLink to="/" aria-label="Search music" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb]">
                            <Search className="h-[18px] w-[18px]" />
                        </NavLink>
                        <NavLink to="/artists/suggested" aria-label="Explore artists" className="hidden h-10 items-center gap-2 rounded-full bg-[#f3f4f6] px-4 text-[13px] font-semibold text-[#374151] hover:bg-[#e5e7eb] sm:flex">
                            <Compass className="h-4 w-4" /> Explore
                        </NavLink>
                    </div>
                </header>
                <main className="melora-content mx-auto w-full max-w-[1480px] px-5 pb-36 pt-7 md:px-10 md:pt-9">
                    {children}
                </main>
            </div>
        </div>
    )
}
