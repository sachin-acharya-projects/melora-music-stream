import { cn } from "@/lib/utils"
import { type LucideIcon } from "lucide-react"

export function MenuButton({
    onClick,
    icon: Icon,
    label,
    danger,
}: {
    onClick: () => void
    icon: LucideIcon
    label: string
    danger?: boolean
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                danger
                    ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/5",
            )}
        >
            <Icon className='h-4 w-4' />
            {label}
        </button>
    )
}
