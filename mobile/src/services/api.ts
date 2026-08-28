import { http } from '@/services/http';
import type {
  Song,
  Playlist,
  Artist,
  Album,
  SearchResults,
  RadioSeed,
  Stats,
} from '@/types';

export type ListParams = { limit?: number; offset?: number; q?: string };

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await http.get<T>(url, { params });
  return data;
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await http.post<T>(url, body);
  return data;
}

async function patch<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await http.patch<T>(url, body);
  return data;
}

async function del<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await http.delete<T>(url, { data: body });
  return data;
}

/* ---------------- Search ---------------- */

export const searchApi = {
  query: (q: string) => get<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
  suggestions: (q: string) =>
    get<Song[]>(`/search/suggestions?q=${encodeURIComponent(q)}`),
  tracks: (playlistId: string) =>
    get<Song[]>(`/search/tracks?playlist_id=${encodeURIComponent(playlistId)}`),
  history: () => get<{ id: string; query: string; created_at?: string }[]>('/search/history'),
  clearHistory: () => del('/search/history'),
  deleteHistory: (id: string) => del(`/search/history/${id}`),
};

/* ---------------- Playlists ---------------- */

export const playlistsApi = {
  list: (params?: ListParams) => get<Playlist[]>('/playlists/', params as never),
  discover: () => get<Playlist[]>('/playlists/discover'),
  following: () => get<Playlist[]>('/playlists/following'),
  options: () => get<{ id: string; name: string }[]>('/playlists/options'),
  shared: (token: string) => get<Playlist>(`/playlists/shared/${token}`),
  detail: (id: string, params?: ListParams) =>
    get<Playlist>(`/playlists/${id}`, params as never),
  create: (name: string, description?: string, isPublic = false) =>
    post<Playlist>('/playlists/', { name, description, is_public: isPublic }),
  update: (id: string, body: Partial<Playlist>) => patch<Playlist>(`/playlists/${id}`, body),
  remove: (id: string) => del(`/playlists/${id}`),
  add: (id: string, song: Song) =>
    post(`/playlists/${id}/add`, { song_id: song.id }),
  addBulk: (id: string, songs: Song[]) =>
    post(`/playlists/${id}/add-bulk`, { song_ids: songs.map((s) => s.id) }),
  removeSong: (id: string, songId: string) =>
    del(`/playlists/${id}/songs/${songId}`),
  reorder: (id: string, songIds: string[]) =>
    post(`/playlists/${id}/reorder`, { song_ids: songIds }),
  import: (url: string) => post<Playlist>('/playlists/import', { url }),
  sync: (id: string) => post(`/playlists/${id}/sync`),
  share: (id: string) => post<{ token: string }>(`/playlists/${id}/share`),
  revokeShare: (id: string) => del(`/playlists/${id}/share`),
  follow: (id: string) => post(`/playlists/${id}/follow`),
};

/* ---------------- Artists ---------------- */

export const artistsApi = {
  list: (params?: ListParams) => get<Artist[]>('/artists/', params as never),
  featured: () => get<Artist[]>('/artists/featured'),
  suggested: () => get<Artist[]>('/artists/suggested'),
  following: () => get<Artist[]>('/artists/following'),
  youtubeSearch: (q: string) =>
    get<{ id: string; name: string; thumbnail?: string }[]>(
      `/artists/youtube/search?q=${encodeURIComponent(q)}`
    ),
  import: (channelId: string) => post<Artist>('/artists/youtube/import', { channel_id: channelId }),
  detail: (slug: string) => get<Artist>(`/artists/${slug}`),
  songs: (slug: string) => get<Song[]>(`/artists/${slug}/songs`),
  albums: (slug: string) => get<Album[]>(`/artists/${slug}/albums`),
  recentlyPlayed: (slug: string) => get<Song[]>(`/artists/${slug}/recently-played`),
  follow: (id: string) => post(`/artists/${id}/follow`),
};

/* ---------------- Albums ---------------- */

export const albumsApi = {
  favorites: () => get<Album[]>('/albums/favorites'),
  favorite: (browseId: string) => post(`/albums/${browseId}/favorite`),
  unfavorite: (browseId: string) => del(`/albums/${browseId}/favorite`),
  detail: (browseId: string) => get<Album & { songs?: Song[] }>(`/albums/${browseId}`),
};

/* ---------------- Radio ---------------- */

export const radioApi = {
  genres: () => get<{ name: string }[]>('/radio/genres'),
  moods: () => get<{ name: string }[]>('/radio/moods'),
  seeds: () => get<{ genres: string[]; top_artists: { id: string; name: string }[] }>('/radio/seeds'),
  generate: (seed: RadioSeed, count = 20) =>
    get<Song[]>(
      `/radio/?seed_type=${seed.type}&seed_value=${encodeURIComponent(
        seed.value
      )}&count=${count}`
    ),
};

/* ---------------- Discovery / recs ---------------- */

export const recommendationsApi = {
  list: (limit = 30) => get<Song[]>('/recommendations/', { limit }),
};

export const releasesApi = {
  list: (params?: ListParams) => get<Song[]>('/releases/', params as never),
};

export const discoverApi = {
  feed: () =>
    get<{
      trending?: Song[];
      new_releases?: Album[];
      mood_playlists?: Playlist[];
    }>('/discover/'),
};

/* ---------------- History & Stats ---------------- */

export const historyApi = {
  list: (params?: ListParams) => get<Song[]>('/history/', params as never),
  recent: () => get<Song[]>('/history/recent'),
  recentlyPlayed: (params?: ListParams) =>
    get<Song[]>('/history/recently-played', params as never),
  stats: () => get('/history/stats'),
};

export const statsApi = {
  overview: () => get<Stats>('/stats/'),
  topArtists: () => get<{ name: string; count: number }[]>('/stats/top-artists'),
  topSongs: () => get<{ title: string; count: number }[]>('/stats/top-songs'),
  topGenres: () => get<{ genre: string; count: number }[]>('/stats/genres'),
  recalculate: () => post('/stats/recalculate'),
};

/* ---------------- Notifications ---------------- */

export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  read: boolean;
  created_at?: string;
  type?: string;
}

export const notificationsApi = {
  list: () => get<{ notifications: AppNotification[]; unread_count: number }>('/notifications/'),
  unreadCount: () => get<{ unread_count: number }>('/notifications/unread-count'),
  markRead: (id: string) => post(`/notifications/${id}/read`),
  markAllRead: () => post('/notifications/read-all'),
  settings: () => get<Record<string, boolean>>('/notifications/settings'),
  updateSettings: (settings: Record<string, boolean>) =>
    patch('/notifications/settings', settings),
};
