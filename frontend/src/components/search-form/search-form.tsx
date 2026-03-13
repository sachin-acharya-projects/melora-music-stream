import { Search } from "lucide-react"
import { useState } from "react"

interface SearchFormProps {
    onSearch: (q: string) => void
    isLoading?: boolean
}

export default function SearchForm({ onSearch, isLoading }: SearchFormProps) {
    const [q, setQ] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (q.trim()) {
            onSearch(q)
        }
    }

    return (
        <form className='flex gap-2' onSubmit={handleSubmit}>
            <div className='w-140'>
                <input
                    type='text'
                    className='w-full rounded-lg border bg-white p-4 dark:bg-black'
                    placeholder='Search videos...'
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
            </div>

            <div>
                <button
                    type='submit'
                    disabled={isLoading}
                    className='bg-secondary text-primary cursor-pointer rounded-lg border p-4 disabled:opacity-50'
                >
                    <Search />
                </button>
            </div>
        </form>
    )
}
