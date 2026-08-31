import { http } from '@/services/http';
import type { Song } from '@/types';

export interface PlaybackStatePayload {
  last_song_id?: string | null;
  current_queue?: Song[];
  last_playlist_id?: string | null;
  recent_songs?: Song[];
}

function toWireSong(song: Song): Record<string, unknown> {
  return {
    id: song.id,
    title: song.title,
    uploader: song.uploader ?? song.artist ?? '',
    thumbnail: song.thumbnail ?? '',
    duration: song.duration ?? 0,
  };
}

export async function saveState(state: PlaybackStatePayload): Promise<void> {
  try {
    await http.post('/state/', {
      last_song_id: state.last_song_id ?? null,
      current_queue: (state.current_queue ?? []).map(toWireSong),
      last_playlist_id: state.last_playlist_id ?? null,
      recent_songs: (state.recent_songs ?? []).map(toWireSong),
    });
  } catch {
    // non-critical
  }
}

export async function loadState(): Promise<PlaybackStatePayload | null> {
  try {
    const { data } = await http.get<PlaybackStatePayload>('/state/');
    return data;
  } catch {
    return null;
  }
}

export async function recordHistory(song: Song): Promise<void> {
  try {
    await http.post('/history/', {
      song: toWireSong(song),
    });
  } catch {
    // non-critical
  }
}
