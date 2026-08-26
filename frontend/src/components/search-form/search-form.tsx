import { History, RefreshCw, Search } from "lucide-react"
import { useState } from "react"

interface SearchFormProps {
    value: string
    onValueChange: (q: string) => void
    onSearch: (q: string) => void
    isLoading?: boolean
    isRefreshing?: boolean
    cached?: boolean
    onRefresh?: () => void
    suggestions?: string[]
    recentSearches?: string[]
}

export default function SearchForm({
    value,
    onValueChange,
    onSearch,
    isLoading,
    isRefreshing,
    cached,
    onRefresh,
    suggestions,
    recentSearches,
}: SearchFormProps) {
    const [focused, setFocused] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (value.trim()) {
            onSearch(value)
        }
        setFocused(false)
    }

    const showSuggestions = focused && !!value.trim() && (suggestions?.length ?? 0) > 0
    const showRecent =
        !value.trim() && !showSuggestions && (recentSearches?.length ?? 0) > 0

    return (
        <form className='flex flex-col gap-3' onSubmit={handleSubmit}>
            <div className='flex gap-2'>
                <div className='w-full md:w-140'>
                    <div className='relative'>
                        <input
                            type='text'
                            className='w-full rounded-lg border bg-white p-4 dark:bg-black'
                            placeholder='Search music, artists, albums...'
                            value={value}
                            onChange={(e) => onValueChange(e.target.value)}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setTimeout(() => setFocused(false), 150)}
                        />
                        {showSuggestions && (
                            <ul className='dark:bg-card absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-white/10'>
                                {suggestions!.map((suggestion) => (
                                    <li key={suggestion}>
                                        <button
                                            type='button'
                                            onMouseDown={(e) => {
                                                e.preventDefault()
                                                onValueChange(suggestion)
                                                onSearch(suggestion)
                                            }}
                                            className='flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-red-50 dark:text-white dark:hover:bg-red-950'
                                        >
                                            <Search className='h-4 w-4 shrink-0 text-gray-400' />
                                            <span className='truncate'>{suggestion}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div>
                    <button
                        type='submit'
                        disabled={isLoading}
                        className='bg-secondary text-primary cursor-pointer rounded-lg border p-4 disabled:opacity-50'
                        title='Search'
                    >
                        <Search />
                    </button>
                </div>

                {cached && onRefresh && (
                    <div>
                        <button
                            type='button'
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className='bg-secondary text-primary cursor-pointer rounded-lg border p-4 disabled:opacity-50'
                            title='Refresh results'
                        >
                            <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
                        </button>
                    </div>
                )}
            </div>

            {showRecent && (
                <div className='flex flex-wrap gap-2'>
                    {recentSearches!.map((q) => (
                        <button
                            key={q}
                            type='button'
                            onClick={() => onSearch(q)}
                            className='flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-red-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-red-950'
                        >
                            <History className='h-3.5 w-3.5 text-gray-400' />
                            <span className='max-w-48 truncate'>{q}</span>
                        </button>
                    ))}
                </div>
            )}
        </form>
    )
}

