import ConfirmationDialog from "@/components/ui/confirmation-dialog/confirmation-dialog"
import { usePlaylists } from "@/hooks/usePlaylists"
import { useTitle } from "@/hooks/useTitle"
import { type Playlist } from "@/types"
import { Check, Edit2, Loader2, Plus, Trash2, X } from "lucide-react"
import { useState } from "react"

export default function EditPlaylists() {
    useTitle("Manage Playlists")
    const [editingId, setEditingId] = useState<string | null>(null)
    const [newName, setNewName] = useState("")
    const [createName, setCreateName] = useState("")

    // Dialog state
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [playlistToDelete, setPlaylistToDelete] = useState<{ id: string; name: string } | null>(
        null,
    )

    const { playlists, isLoading, createPlaylist, renamePlaylist, deletePlaylist, isRenaming } =
        usePlaylists()

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (createName) {
            await createPlaylist(createName)
            setCreateName("")
        }
    }

    const handleRename = (e: React.FormEvent) => {
        e.preventDefault()
        if (editingId && newName) {
            renamePlaylist({ id: editingId, name: newName })
        }
    }

    const handleDeleteClick = (playlist: Playlist) => {
        setPlaylistToDelete({ id: playlist.id, name: playlist.name })
        setIsDeleteDialogOpen(true)
    }

    if (isLoading)
        return (
            <div className='flex justify-center pt-20'>
                <Loader2 className='h-12 w-12 animate-spin text-red-600' />
            </div>
        )

    return (
        <div className='mx-auto w-full max-w-2xl px-4 py-10'>
            <h1 className='mb-8 text-3xl font-bold dark:text-white'>Manage Playlists</h1>

            <div className='mb-8 rounded-2xl border bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5'>
                <h2 className='mb-4 font-semibold dark:text-white'>Create New Playlist</h2>
                <form onSubmit={handleCreate} className='flex gap-2'>
                    <input
                        type='text'
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        placeholder='Playlist Name'
                        className='flex-1 rounded-lg border bg-gray-50 p-2 dark:border-white/5 dark:bg-black dark:text-white'
                    />
                    <button
                        type='submit'
                        disabled={!createName}
                        className='flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'
                    >
                        <Plus className='h-4 w-4' />
                        Create
                    </button>
                </form>
            </div>

            <div className='flex flex-col gap-4'>
                {playlists.map((playlist) => (
                    <div
                        key={playlist.id}
                        className='flex items-center justify-between rounded-xl border bg-white p-4 dark:border-white/10 dark:bg-white/5'
                    >
                        <div className='flex items-center gap-4'>
                            {editingId === playlist.id ? (
                                <form className='flex items-center gap-2' onSubmit={handleRename}>
                                    <input
                                        type='text'
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className='rounded border px-2 py-1 text-sm dark:border-white/10 dark:bg-black dark:text-white'
                                        autoFocus
                                    />
                                    <button
                                        type='submit'
                                        className='cursor-pointer text-emerald-500'
                                        disabled={isRenaming}
                                    >
                                        <Check className='h-4 w-4' />
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => setEditingId(null)}
                                        className='cursor-pointer text-red-500'
                                    >
                                        <X className='h-4 w-4' />
                                    </button>
                                </form>
                            ) : (
                                <span className='font-medium capitalize dark:text-white'>
                                    {playlist.name}
                                </span>
                            )}
                            <span className='text-xs text-gray-400'>
                                {playlist.songs.length} songs
                            </span>
                        </div>

                        <div className='flex gap-2'>
                            <button
                                onClick={() => {
                                    setEditingId(playlist.id)
                                    setNewName(playlist.name)
                                }}
                                className='cursor-pointer rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-white/5'
                            >
                                <Edit2 className='h-4 w-4' />
                            </button>
                            <button
                                onClick={() => handleDeleteClick(playlist)}
                                className='cursor-pointer rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10'
                            >
                                <Trash2 className='h-4 w-4' />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                title='Delete Playlist'
                message={`Are you sure you want to delete "${playlistToDelete?.name}"? This action cannot be undone.`}
                confirmText='Delete'
                onConfirm={() => playlistToDelete && deletePlaylist(playlistToDelete.id)}
                onCancel={() => setIsDeleteDialogOpen(false)}
                type='danger'
            />
        </div>
    )
}
