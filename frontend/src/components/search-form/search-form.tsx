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
    const uniqueRecentSearches = [...new Set(recentSearches ?? [])]
    const showRecent = focused && !value.trim() && uniqueRecentSearches.length > 0

    const selectSearch = (query: string) => {
        onValueChange(query)
        onSearch(query)
        setFocused(false)
    }

    return (
        <form className='mx-auto flex w-full max-w-2xl flex-col gap-3' onSubmit={handleSubmit}>
            <div className='relative flex w-full min-w-0 gap-2'>
                <div className='min-w-0 flex-1'>
                    <input
                        type='text'
                        className='h-13 w-full rounded-lg border bg-white px-4 text-sm dark:bg-black'
                        placeholder='Search music, artists, albums...'
                        value={value}
                        onChange={(e) => onValueChange(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setTimeout(() => setFocused(false), 150)}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") setFocused(false)
                        }}
                        aria-expanded={showRecent || showSuggestions}
                        aria-controls='search-form-suggestions'
                        aria-autocomplete='list'
                    />
                </div>

                <div className='shrink-0'>
                    <button
                        type='submit'
                        disabled={isLoading}
                        className='bg-secondary text-primary flex h-13 w-13 cursor-pointer items-center justify-center rounded-lg border disabled:opacity-50'
                        title='Search'
                        aria-label='Search'
                    >
                        <Search />
                    </button>
                </div>

                {cached && onRefresh && (
                    <div className='shrink-0'>
                        <button
                            type='button'
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className='bg-secondary text-primary flex h-13 w-13 cursor-pointer items-center justify-center rounded-lg border disabled:opacity-50'
                            title='Refresh results'
                            aria-label='Refresh results'
                        >
                            <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
                        </button>
                    </div>
                )}

                {(showRecent || showSuggestions) && (
                    <div
                        id='search-form-suggestions'
                        role='listbox'
                        className='dark:bg-card absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-xl dark:border-white/10'
                    >
                        {showRecent && (
                            <>
                                <div className='px-4 pb-2 pt-1 text-xs font-medium text-gray-500 dark:text-gray-400'>
                                    Recent searches
                                </div>
                                {uniqueRecentSearches.map((query) => (
                                    <button
                                        key={query}
                                        type='button'
                                        role='option'
                                        aria-selected='false'
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => selectSearch(query)}
                                        className='flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-800 transition-colors hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-white/10'
                                    >
                                        <History className='h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400' />
                                        <span className='min-w-0 flex-1 truncate'>{query}</span>
                                    </button>
                                ))}
                            </>
                        )}

                        {showSuggestions &&
                            suggestions!.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type='button'
                                    role='option'
                                    aria-selected='false'
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => selectSearch(suggestion)}
                                    className='flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-800 transition-colors hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-white/10'
                                >
                                    <Search className='h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400' />
                                    <span className='min-w-0 flex-1 truncate'>{suggestion}</span>
                                </button>
                            ))}
                    </div>
                )}
            </div>
        </form>
    )
}
