interface SongSkeletonProps {
    view?: "grid" | "list"
}

export default function SongSkeleton({ view = "grid" }: SongSkeletonProps) {
    if (view === "list") {
        return (
            <div className='dark:bg-card flex animate-pulse items-center gap-4 rounded-xl border border-gray-100 bg-white p-2 dark:border-white/5'>
                <div className='h-14 w-24 shrink-0 rounded-lg bg-gray-200 dark:bg-white/10' />
                <div className='flex flex-1 flex-col gap-2'>
                    <div className='h-4 w-1/3 rounded bg-gray-200 dark:bg-white/10' />
                    <div className='h-3 w-1/4 rounded bg-gray-200 dark:bg-white/10' />
                </div>
                <div className='mr-2 h-4 w-12 rounded bg-gray-200 dark:bg-white/10' />
            </div>
        )
    }

    return (
        <div className='dark:bg-card animate-pulse overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-white/5'>
            <div className='aspect-video w-full bg-gray-200 dark:bg-white/10' />
            <div className='flex flex-col gap-2 p-3'>
                <div className='h-4 w-3/4 rounded bg-gray-200 dark:bg-white/10' />
                <div className='h-3 w-1/2 rounded bg-gray-200 dark:bg-white/10' />
            </div>
        </div>
    )
}
