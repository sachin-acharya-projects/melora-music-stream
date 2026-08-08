import { type PlaylistItem } from "@/store/player/types"
import { type Song } from "@/types"
import { getUUID } from "@/utils/uuid/uuid"

export const createPlaylistItem = (song: Song): PlaylistItem => ({
    ...song,
    queueId: getUUID(),
})
