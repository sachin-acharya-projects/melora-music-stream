export interface User {
  id: string;
  email?: string;
  display_name?: string;
  username?: string;
  bio?: string;
  favorite_genres?: string[];
  avatar?: string;
  is_super_admin?: boolean;
}

export interface Song {
  id: string;
  title: string;
  uploader?: string;
  artist?: string;
  thumbnail?: string;
  duration?: number;
  views?: number;
  [key: string]: unknown;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  art?: string;
  thumbnail?: string;
  is_public?: boolean;
  is_collaborative?: boolean;
  owner_id?: string;
  owner_name?: string;
  song_count?: number;
  track_count?: number;
  songs?: Song[];
  [key: string]: unknown;
}

export interface Artist {
  id: string;
  slug: string;
  name: string;
  thumbnail?: string;
  description?: string;
  bio?: string;
  following?: boolean;
  song_count?: number;
  [key: string]: unknown;
}

export interface Album {
  browse_id: string;
  title: string;
  artist?: string;
  artist_name?: string;
  thumbnail?: string;
  is_favorite?: boolean;
  songs?: Song[];
  [key: string]: unknown;
}

export interface SearchResults {
  top?: Song | Artist | Album | Playlist | null;
  songs?: Song[];
  artists?: Artist[];
  albums?: Album[];
  playlists?: Playlist[];
  videos?: Song[];
}

export interface RadioSeed {
  type: 'genre' | 'artist' | 'mood' | 'song';
  value: string;
  label?: string;
}

export interface Stats {
  top_artists?: { name: string; count: number }[];
  top_songs?: { title: string; count: number }[];
  top_genres?: { genre: string; count: number }[];
}
