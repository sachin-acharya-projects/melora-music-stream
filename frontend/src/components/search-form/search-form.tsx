import { RefreshCw, Search } from "lucide-react"

interface SearchFormProps {
    value: string
    onValueChange: (q: string) => void
    onSearch: (q: string) => void
    isLoading?: boolean
    isRefreshing?: boolean
    cached?: boolean
    onRefresh?: () => void
}

export default function SearchForm({
    value,
    onValueChange,
    onSearch,
    isLoading,
    isRefreshing,
    cached,
    onRefresh,
}: SearchFormProps) {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (value.trim()) {
            onSearch(value)
        }
    }

    return (
        <form className='flex gap-2' onSubmit={handleSubmit}>
            <div className='w-140'>
                <input
                    type='text'
                    className='w-full rounded-lg border bg-white p-4 dark:bg-black'
                    placeholder='Search music...'
                    value={value}
                    onChange={(e) => onValueChange(e.target.value)}
                />
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
        </form>
    )
}
