import { apiService } from "@/services/api.service"
import { playlistService } from "@/services/playlist.service"
import { createPlaylistItem } from "@/store/player/playlist-item"
import { type PlayerState } from "@/store/player/types"
import { type Song } from "@/types"

export const MAX_RECENT = 50

function toWireSong(song: Song): Song {
    return {
        id: song.id,
        title: song.title,
        uploader: song.uploader,
        thumbnail: song.thumbnail,
        duration: song.duration,
        created_at: song.created_at,
    }
}

export async function syncPlayerState(state: PlayerState): Promise<void> {
    const { currentSong, playlist, lastPlaylistId, recentSongs } = state
    await apiService.updateState({
        last_song_id: currentSong?.id || null,
        current_queue: playlist.map(toWireSong),
        last_playlist_id: lastPlaylistId,
        recent_songs: recentSongs.map(toWireSong),
    })
}

export async function restorePlayerState(): Promise<Partial<PlayerState>> {
    const state = await apiService.getState()

    if (state.current_queue && state.current_queue.length > 0) {
        const playlistItems = state.current_queue.map(createPlaylistItem)
        const songIndex = state.last_song_id
            ? state.current_queue.findIndex((s) => s.id === state.last_song_id)
            : 0

        return {
            playlist: playlistItems,
            currentIndex: songIndex >= 0 ? songIndex : 0,
            currentSong: songIndex >= 0 ? playlistItems[songIndex] : playlistItems[0],
            lastPlaylistId: state.last_playlist_id,
            recentSongs: state.recent_songs || [],
        }
    }

    if (state.last_playlist_id) {
        const playlist = await playlistService.getById(state.last_playlist_id)
        if (playlist && playlist.songs.length > 0) {
            const playlistItems = playlist.songs.map(createPlaylistItem)
            const songIndex = state.last_song_id
                ? playlist.songs.findIndex((s) => s.id === state.last_song_id)
                : 0

            return {
                playlist: playlistItems,
                currentIndex: songIndex >= 0 ? songIndex : 0,
                currentSong: songIndex >= 0 ? playlistItems[songIndex] : playlistItems[0],
                lastPlaylistId: state.last_playlist_id,
                recentSongs: state.recent_songs || [],
            }
        }
    }

    return {
        recentSongs: state.recent_songs || [],
    }
}
