import AdminLayout from "@/components/admin/admin-layout"
import { StatsCard } from "@/components/stats-card/stats-card"
import { useAdminDashboard } from "@/hooks/useAdmin"
import {
    EyeOff,
    ListMusic,
    Mic2,
    PlayCircle,
    Shield,
    Star,
    TrendingUp,
    Users,
    CheckCircle2,
} from "lucide-react"
import { Loader2 } from "lucide-react"

export default function AdminDashboard() {
    const { data, isLoading } = useAdminDashboard()

    if (isLoading || !data) {
        return (
            <AdminLayout>
                <div className='flex justify-center pt-20'>
                    <Loader2 className='h-12 w-12 animate-spin text-red-600' />
                </div>
            </AdminLayout>
        )
    }

    const artistPublishedPct = data.artists_total
        ? Math.round((data.artists_published / data.artists_total) * 100)
        : 0
    const songPublishedPct = data.songs_total
        ? Math.round((data.songs_published / data.songs_total) * 100)
        : 0

    return (
        <AdminLayout>
            <div className='mb-8'>
                <h1 className='text-3xl font-bold dark:text-white'>
                    Dashboard <span className='text-red-500'>Overview</span>
                </h1>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                    Catalog and activity metrics across Melora
                </p>
            </div>

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                <StatsCard
                    icon={Mic2}
                    label='Artists'
                    value={String(data.artists_total)}
                    hint={`${data.artists_featured} featured · ${artistPublishedPct}% published`}
                />
                <StatsCard
                    icon={ListMusic}
                    label='Songs'
                    value={String(data.songs_total)}
                    hint={`${data.songs_featured} featured · ${songPublishedPct}% published`}
                />
                <StatsCard
                    icon={Users}
                    label='Users'
                    value={String(data.users_total)}
                    hint={`${data.active_users} active`}
                />
                <StatsCard
                    icon={PlayCircle}
                    label='Total plays'
                    value={String(data.total_plays)}
                    hint={`${data.plays_last_30_days} in the last 30 days`}
                />
            </div>

            <div className='mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                <div className='dark:bg-card rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10'>
                    <div className='flex items-center gap-3'>
                        <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-950'>
                            <CheckCircle2 className='h-5 w-5 text-green-500' />
                        </span>
                        <div>
                            <p className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                                Artists published
                            </p>
                            <p className='text-lg font-bold dark:text-white'>
                                {data.artists_published}
                            </p>
                        </div>
                    </div>
                </div>
                <div className='dark:bg-card rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10'>
                    <div className='flex items-center gap-3'>
                        <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950'>
                            <EyeOff className='h-5 w-5 text-amber-500' />
                        </span>
                        <div>
                            <p className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                                Artists hidden
                            </p>
                            <p className='text-lg font-bold dark:text-white'>{data.artists_hidden}</p>
                        </div>
                    </div>
                </div>
                <div className='dark:bg-card rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10'>
                    <div className='flex items-center gap-3'>
                        <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-950'>
                            <CheckCircle2 className='h-5 w-5 text-green-500' />
                        </span>
                        <div>
                            <p className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                                Songs published
                            </p>
                            <p className='text-lg font-bold dark:text-white'>{data.songs_published}</p>
                        </div>
                    </div>
                </div>
                <div className='dark:bg-card rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10'>
                    <div className='flex items-center gap-3'>
                        <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950'>
                            <EyeOff className='h-5 w-5 text-amber-500' />
                        </span>
                        <div>
                            <p className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                                Songs hidden
                            </p>
                            <p className='text-lg font-bold dark:text-white'>{data.songs_hidden}</p>
                        </div>
                    </div>
                </div>
                <div className='dark:bg-card rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10'>
                    <div className='flex items-center gap-3'>
                        <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950'>
                            <Star className='h-5 w-5 text-purple-500' />
                        </span>
                        <div>
                            <p className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                                Featured artists
                            </p>
                            <p className='text-lg font-bold dark:text-white'>
                                {data.artists_featured}
                            </p>
                        </div>
                    </div>
                </div>
                <div className='dark:bg-card rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10'>
                    <div className='flex items-center gap-3'>
                        <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950'>
                            <Star className='h-5 w-5 text-purple-500' />
                        </span>
                        <div>
                            <p className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                                Featured songs
                            </p>
                            <p className='text-lg font-bold dark:text-white'>{data.songs_featured}</p>
                        </div>
                    </div>
                </div>
                <div className='dark:bg-card rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10'>
                    <div className='flex items-center gap-3'>
                        <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950'>
                            <TrendingUp className='h-5 w-5 text-blue-500' />
                        </span>
                        <div>
                            <p className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                                Plays in 30 days
                            </p>
                            <p className='text-lg font-bold dark:text-white'>
                                {data.plays_last_30_days}
                            </p>
                        </div>
                    </div>
                </div>
                <div className='dark:bg-card rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10'>
                    <div className='flex items-center gap-3'>
                        <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950'>
                            <Shield className='h-5 w-5 text-red-500' />
                        </span>
                        <div>
                            <p className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                                Active users
                            </p>
                            <p className='text-lg font-bold dark:text-white'>{data.active_users}</p>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}
