import Avatar from "@/components/ui/avatar/avatar"
import { useCollaborators } from "@/hooks/usePlaylists"
import { playlistService } from "@/services/playlist.service"
import { type CollaboratorRole, type UserSearchResult } from "@/types"
import { motion } from "framer-motion"
import { Loader2, Search, UserPlus, Users, X } from "lucide-react"
import { useEffect, useState } from "react"

interface CollaboratorsModalProps {
    playlistId: string
    canManage: boolean
    onClose: () => void
}

export function CollaboratorsModal({ playlistId, canManage, onClose }: CollaboratorsModalProps) {
    const { collaborators, isLoading, addCollaborator, isAdding, removeCollaborator } =
        useCollaborators(playlistId)
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<UserSearchResult[]>([])
    const [searching, setSearching] = useState(false)
    const [role, setRole] = useState<CollaboratorRole>("editor")
    const [error, setError] = useState("")

    useEffect(() => {
        if (query.trim().length < 2) return
        let cancelled = false
        const timer = setTimeout(async () => {
            setSearching(true)
            try {
                const data = await playlistService.searchUsers(query)
                if (!cancelled) setResults(data)
            } catch {
                if (!cancelled) setResults([])
            } finally {
                if (!cancelled) setSearching(false)
            }
        }, 300)
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [query])

    const handleInvite = async (user: UserSearchResult) => {
        setError("")
        try {
            await addCollaborator({ userId: user.id, role })
            setQuery("")
            setResults([])
        } catch {
            setError("Could not add that user. They may already be a collaborator.")
        }
    }

    return (
        <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className='dark:bg-card w-full max-w-lg rounded-2xl border bg-white p-6 shadow-xl dark:border-white/10'
                onClick={(e) => e.stopPropagation()}
            >
                <div className='mb-4 flex items-center justify-between'>
                    <h2 className='flex items-center gap-2 text-lg font-bold dark:text-white'>
                        <Users className='h-5 w-5 text-red-600' /> Collaborators
                    </h2>
                    <button
                        onClick={onClose}
                        className='cursor-pointer text-gray-400 transition-colors hover:text-red-500'
                    >
                        <X className='h-5 w-5' />
                    </button>
                </div>

                {canManage && (
                    <div className='mb-5'>
                        <div className='flex flex-col gap-2'>
                            <div className='flex gap-2'>
                                <div className='relative flex-1'>
                                    <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400' />
                                    <input
                                        type='text'
                                        value={query}
                                        onChange={(e) => {
                                            setQuery(e.target.value)
                                            if (e.target.value.trim().length < 2) {
                                                setResults([])
                                            }
                                        }}
                                        placeholder='Search users by name...'
                                        autoFocus
                                        className='dark:bg-card h-11 w-full rounded-xl border bg-white pr-4 pl-10 text-sm dark:border-white/10 dark:text-white'
                                    />
                                </div>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as CollaboratorRole)}
                                    className='dark:bg-card h-11 cursor-pointer rounded-xl border bg-white px-3 text-sm dark:border-white/10 dark:text-white'
                                >
                                    <option value='editor'>Editor</option>
                                    <option value='viewer'>Viewer</option>
                                </select>
                            </div>
                            {error && <p className='text-xs text-red-500'>{error}</p>}
                            {query.trim().length >= 2 && (
                                <div className='overflow-hidden rounded-xl border dark:border-white/10'>
                                    {searching ? (
                                        <div className='flex items-center justify-center gap-2 py-4 text-sm text-gray-500'>
                                            <Loader2 className='h-4 w-4 animate-spin' />{" "}
                                            Searching...
                                        </div>
                                    ) : results.length === 0 ? (
                                        <p className='py-4 text-center text-sm text-gray-500'>
                                            No users found
                                        </p>
                                    ) : (
                                        results.map((user) => {
                                            const alreadyAdded = collaborators.some(
                                                (c) => c.user_id === user.id,
                                            )
                                            return (
                                                <div
                                                    key={user.id}
                                                    className='flex items-center gap-3 border-b p-3 last:border-b-0 dark:border-white/10'
                                                >
                                                    <Avatar
                                                        src={user.avatar_url}
                                                        name={user.display_name || user.username}
                                                        size={32}
                                                    />
                                                    <div className='min-w-0 flex-1'>
                                                        <p className='truncate text-sm font-medium dark:text-white'>
                                                            {user.display_name || user.username}
                                                        </p>
                                                        <p className='truncate text-xs text-gray-500'>
                                                            @{user.username}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleInvite(user)}
                                                        disabled={alreadyAdded || isAdding}
                                                        className='flex cursor-pointer items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'
                                                    >
                                                        <UserPlus className='h-3.5 w-3.5' />
                                                        {alreadyAdded ? "Added" : "Invite"}
                                                    </button>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className='flex flex-col gap-2'>
                    {isLoading ? (
                        <div className='flex justify-center py-8'>
                            <Loader2 className='h-6 w-6 animate-spin text-red-600' />
                        </div>
                    ) : collaborators.length === 0 ? (
                        <p className='py-6 text-center text-sm text-gray-500'>
                            No collaborators yet. Invite someone to edit this playlist together.
                        </p>
                    ) : (
                        collaborators.map((collab) => (
                            <div
                                key={collab.user_id}
                                className='flex items-center gap-3 rounded-xl border p-3 dark:border-white/10'
                            >
                                <Avatar
                                    src={collab.avatar_url}
                                    name={collab.display_name || collab.username}
                                    size={36}
                                />
                                <div className='min-w-0 flex-1'>
                                    <p className='truncate text-sm font-medium dark:text-white'>
                                        {collab.display_name || collab.username}
                                    </p>
                                    <p className='truncate text-xs text-gray-500'>
                                        @{collab.username}
                                    </p>
                                </div>
                                <span className='rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 capitalize dark:bg-white/10 dark:text-gray-400'>
                                    {collab.role}
                                </span>
                                {canManage && (
                                    <button
                                        onClick={() => removeCollaborator(collab.user_id)}
                                        className='cursor-pointer text-gray-400 transition-colors hover:text-red-500'
                                        title='Remove collaborator'
                                    >
                                        <X className='h-4 w-4' />
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </motion.div>
        </div>
    )
}
