export const ENDPOINTS = {
    SEARCH: "/search/",
    STATE: "/state/",
    STREAM: (videoId: string) => `/stream/${videoId}`,
    DOWNLOAD: (videoId: string) => `/download/${videoId}`,
    RELATED_SONGS: (songId: string) => `/songs/${songId}/related`,
    PLAYLISTS: {
        BASE: "/playlists/",
        BY_ID: (id: string) => `/playlists/${id}`,
        ADD_SONG: (playlistIdOrName: string) =>
            `/playlists/${encodeURIComponent(playlistIdOrName)}/add`,
        ADD_SONGS_BULK: (playlistIdOrName: string) =>
            `/playlists/${encodeURIComponent(playlistIdOrName)}/add-bulk`,
        REMOVE_SONG: (playlistId: string, songId: string) =>
            `/playlists/${playlistId}/songs/${songId}`,
        IMPORT: "/playlists/import",
        SHARE: (playlistId: string) => `/playlists/${playlistId}/share`,
        SHARED_BY_TOKEN: (token: string) => `/playlists/shared/${token}`,
    },
    AUTH: {
        LOGIN: "/auth/login",
        GOOGLE_CALLBACK: "/auth/google/callback",
        ME: "/auth/me",
        REFRESH: "/auth/refresh",
        LOGOUT: "/auth/logout",
    },
} as const
