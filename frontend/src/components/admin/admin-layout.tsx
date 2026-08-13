import { useAuth } from "@/hooks/useAuth"
import { useTitle } from "@/hooks/useTitle"
import {
    BarChart3,
    LayoutDashboard,
    ListMusic,
    Mic2,
    Shield,
    Users,
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"

const NAV_ITEMS = [
    { to: "/admin", end: true, label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/artists", end: false, label: "Artists", icon: Mic2 },
    { to: "/admin/songs", end: false, label: "Songs", icon: ListMusic },
    { to: "/admin/users", end: false, label: "Users", icon: Users },
] as const

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const location = useLocation()
    const { user } = useAuth()

    useTitle(`Admin${location.pathname === "/admin" ? "" : ` · ${location.pathname.split("/")[2]}`}`)

    return (
        <div className='mx-auto flex w-full max-w-375 gap-8 px-4 pt-10 pb-40'>
            <aside className='hidden w-56 shrink-0 flex-col gap-1 md:flex'>
                <div className='mb-4 flex items-center gap-2 px-2'>
                    <Shield className='h-5 w-5 text-red-500' />
                    <h2 className='text-lg font-bold dark:text-white'>Admin</h2>
                </div>
                {NAV_ITEMS.map((item) => {
                    const active = item.end
                        ? location.pathname === item.to
                        : location.pathname.startsWith(item.to)
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                                active
                                    ? "bg-red-600 text-white"
                                    : "text-gray-600 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10"
                            }`}
                        >
                            <Icon className='h-4 w-4' />
                            {item.label}
                        </Link>
                    )
                })}
                <div className='mt-auto px-2 pt-8 text-xs text-gray-400 dark:text-gray-500'>
                    Signed in as
                    <br />
                    <span className='font-medium text-gray-600 dark:text-gray-300'>
                        {user?.display_name || user?.username}
                    </span>
                </div>
            </aside>

            <main className='min-w-0 flex-1'>
                <div className='mb-6 flex items-center gap-2 md:hidden'>
                    <Shield className='h-5 w-5 text-red-500' />
                    <h2 className='text-lg font-bold dark:text-white'>Admin</h2>
                </div>
                {children}
            </main>

            <Link
                to='/'
                className='fixed bottom-6 right-6 z-100 flex h-13 w-13 cursor-pointer items-center justify-center rounded-full bg-white/80 shadow-lg backdrop-blur transition-transform hover:scale-105 dark:bg-white/10 dark:text-white'
                title='Back to Melora'
            >
                <BarChart3 className='h-5 w-5' />
            </Link>
        </div>
    )
}
