import { registerPlugin } from "@capacitor/core"
import type { PluginListenerHandle } from "@capacitor/core"

export interface BackgroundAudioAction {
    action: "play" | "pause" | "next" | "previous" | "seek"
    time?: number
}

export interface BackgroundAudioPlugin {
    enable(): Promise<void>
    setMetadata(opts: { title: string; artist: string }): Promise<void>
    setPlaybackState(opts: {
        state: "playing" | "paused" | "stopped" | "none"
    }): Promise<void>
    setPositionState(opts: {
        duration: number
        position: number
        playbackRate?: number
    }): Promise<void>
    disable(): Promise<void>
    addListener(
        event: "action",
        cb: (data: BackgroundAudioAction) => void,
    ): Promise<PluginListenerHandle>
}

// Web has no native implementation; only used on native platforms.
export const BackgroundAudio = registerPlugin<BackgroundAudioPlugin>("BackgroundAudio")
