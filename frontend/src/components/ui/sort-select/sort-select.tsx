export interface SortSelectOption {
    value: string
    label: string
}

interface SortSelectProps {
    value: string
    onChange: (value: string) => void
    options: SortSelectOption[]
    className?: string
}

export default function SortSelect({ value, onChange, options, className }: SortSelectProps) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label='Sort'
            className={`dark:bg-card flex h-11 cursor-pointer items-center rounded-xl border bg-white px-3 text-sm font-medium shadow-sm transition-all hover:border-red-200 dark:border-white/10 dark:text-white ${className ?? ""}`}
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    )
}
