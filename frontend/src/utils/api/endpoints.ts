export const ENDPOINTS = {
    SEARCH: "/search/",
    STATE: "/state/",
    STREAM: (videoId: string) => `/stream/${videoId}`,
    DOWNLOAD: (videoId: string) => `/download/${videoId}`,
    PLAYLISTS: {
        BASE: "/playlists/",
        BY_ID: (id: string) => `/playlists/${id}`,
        ADD_SONG: (playlistIdOrName: string) =>
            `/playlists/${encodeURIComponent(playlistIdOrName)}/add`,
        REMOVE_SONG: (playlistId: string, songId: string) =>
            `/playlists/${playlistId}/songs/${songId}`,
        IMPORT: "/playlists/import",
    },
} as const
