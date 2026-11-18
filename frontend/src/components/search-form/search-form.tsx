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

    const uniqueRecentSearches = [...new Set(recentSearches ?? [])]
    const showSuggestions = focused && !!value.trim() && (suggestions?.length ?? 0) > 0
    const showRecent = focused && !value.trim() && uniqueRecentSearches.length > 0

    const selectSearch = (query: string) => {
        onValueChange(query)
        onSearch(query)
        setFocused(false)
    }

    return (
        <form className='mx-auto flex w-full max-w-2xl flex-col gap-3' onSubmit={handleSubmit}>
            <div className='flex w-full min-w-0 gap-2'>
                <div className='relative min-w-0 flex-1'>
                    <input
                        type='text'
                        className='h-13 w-full rounded-lg border bg-white px-4 text-sm dark:bg-black'
                        placeholder='Search music, artists, albums...'
                        value={value}
                        onChange={(e) => onValueChange(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") {
                                setFocused(false)
                                e.currentTarget.blur()
                            }
                        }}
                        aria-expanded={showSuggestions || showRecent}
                        aria-controls='search-history-panel'
                        aria-autocomplete='list'
                    />

                    {(showSuggestions || showRecent) && (
                        <div
                            id='search-history-panel'
                            className='dark:bg-card absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-xl dark:border-white/10'
                        >
                            {showRecent && (
                                <>
                                    <div className='flex items-center gap-2 border-b border-gray-100 px-4 py-3 text-xs font-semibold text-gray-500 dark:border-white/10 dark:text-gray-400'>
                                        <History className='h-4 w-4' />
                                        Recent searches
                                    </div>
                                    <ul className='max-h-80 overflow-y-auto py-1'>
                                        {uniqueRecentSearches.map((query) => (
                                            <li key={query}>
                                                <button
                                                    type='button'
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => selectSearch(query)}
                                                    className='flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-sm text-gray-800 transition-colors hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-white/10'
                                                >
                                                    <History className='h-5 w-5 shrink-0 text-gray-400' />
                                                    <span className='min-w-0 flex-1 truncate'>{query}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}

                            {showSuggestions && (
                                <ul className='max-h-80 overflow-y-auto py-1'>
                                    {suggestions!.map((suggestion) => (
                                        <li key={suggestion}>
                                            <button
                                                type='button'
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => selectSearch(suggestion)}
                                                className='flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-800 transition-colors hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-white/10'
                                            >
                                                <Search className='h-4 w-4 shrink-0 text-gray-400' />
                                                <span className='min-w-0 flex-1 truncate'>{suggestion}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                <div className='shrink-0'>
                    <button
                        type='submit'
                        disabled={isLoading}
                        className='bg-secondary text-primary flex h-13 w-13 cursor-pointer items-center justify-center rounded-lg border disabled:opacity-50'
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
        </form>
    )
}
