import { http } from '@/services/http';
import type { Song } from '@/types';

export interface PlaybackStatePayload {
  last_song_id?: string | null;
  current_queue?: Song[];
  last_playlist_id?: string | null;
  recent_songs?: Song[];
}

export async function saveState(state: PlaybackStatePayload): Promise<void> {
  try {
    await http.post('/state', state);
  } catch {
    // non-critical
  }
}

export async function loadState(): Promise<PlaybackStatePayload | null> {
  try {
    const { data } = await http.get<PlaybackStatePayload>('/state');
    return data;
  } catch {
    return null;
  }
}

export async function recordHistory(songId: string): Promise<void> {
  try {
    await http.post('/history', { song_id: songId });
  } catch {
    // non-critical
  }
}
