import { LayoutGrid, List } from "lucide-react"

interface ViewToggleProps {
    view: "grid" | "list"
    onChange: (view: "grid" | "list") => void
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
    return (
        <div className='flex items-center gap-1 rounded-xl bg-secondary p-1 dark:bg-white/5'>
            <button
                onClick={() => onChange("grid")}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
                    view === "grid"
                        ? "bg-white text-red-600 shadow-sm dark:bg-white/10 dark:text-red-500"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
            >
                <LayoutGrid className='h-4 w-4' />
                Grid
            </button>
            <button
                onClick={() => onChange("list")}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
                    view === "list"
                        ? "bg-white text-red-600 shadow-sm dark:bg-white/10 dark:text-red-500"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
            >
                <List className='h-4 w-4' />
                List
            </button>
        </div>
    )
}
