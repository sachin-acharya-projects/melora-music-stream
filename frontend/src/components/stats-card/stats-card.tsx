import { type LucideIcon } from "lucide-react"

interface StatsCardProps {
    icon: LucideIcon
    label: string
    value: string
    hint?: string
}

export function StatsCard({ icon: Icon, label, value, hint }: StatsCardProps) {
    return (
        <div className='dark:bg-card flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10'>
            <span className='flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950'>
                <Icon className='h-6 w-6 text-red-500' />
            </span>
            <div className='min-w-0'>
                <p className='text-xs font-medium text-gray-500 dark:text-gray-400'>{label}</p>
                <p className='truncate text-xl font-bold dark:text-white'>{value}</p>
                {hint && <p className='text-xs text-gray-400'>{hint}</p>}
            </div>
        </div>
    )
}
