import { usePlayerStore } from "@/hooks/usePlayer"
import { cn, slugify } from "@/lib/utils"
import {
    Pause, Play, Repeat, Repeat1, SkipBack, SkipForward,
    Volume2, VolumeX,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

function formatTime(value: number) {
    const safe = Number.isFinite(value) ? Math.max(0, value) : 0
    return `${Math.floor(safe / 60)}:${Math.floor(safe % 60).toString().padStart(2, "0")}`
}

export default function NowPlayingPanel() {
    const navigate = useNavigate()
    const {
        currentSong, isPlaying, togglePlay, playNext, playPrevious,
        repeatMode, setRepeatMode, progress, duration, volume, setVolume,
    } = usePlayerStore()

    const cycleRepeat = () => {
        setRepeatMode(repeatMode === "none" ? "all" : repeatMode === "all" ? "one" : "none")
    }

    return (
        <aside className="melora-now-playing flex min-h-0 w-full flex-col border-b border-[#e9ebef] bg-[#fafbfc] lg:sticky lg:top-0 lg:h-screen lg:w-[340px] lg:shrink-0 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between px-6 pb-4 pt-6">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#9299a5]">Your space</p>
                    <h2 className="mt-1 text-lg font-bold tracking-[-0.4px] text-[#111827]">Now Playing</h2>
                </div>
                <button
                    type="button"
                    onClick={() => navigate("/now-playing")}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-[#687386] transition hover:bg-[#eef0f4] hover:text-[#111827]"
                >
                    Open player
                </button>
            </div>

            {currentSong ? (
                <div className="flex min-h-0 flex-1 flex-col px-6 pb-6">
                    <button
                        type="button"
                        onClick={() => navigate("/now-playing")}
                        className="group relative mx-auto aspect-square w-full max-w-[292px] overflow-hidden rounded-[22px] bg-[#eef0f4] shadow-[0_14px_36px_rgba(17,24,39,0.10)]"
                        aria-label="Open full player"
                    >
                        {currentSong.thumbnail ? (
                            <img
                                src={currentSong.thumbnail}
                                alt={currentSong.title}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-[#9aa2af]">
                                <MusicPlaceholder />
                            </div>
                        )}
                    </button>

                    <div className="mt-6 flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                            <button
                                type="button"
                                onClick={() => navigate("/now-playing")}
                                className="block max-w-full truncate text-left text-[17px] font-bold tracking-[-0.3px] text-[#171d29] hover:text-[#5368a8]"
                                title={currentSong.title}
                            >
                                {currentSong.title}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate(`/artists/${slugify(currentSong.uploader)}`)}
                                className="mt-1 block max-w-full truncate text-left text-sm text-[#7b8493] transition hover:text-[#5368a8]"
                            >
                                {currentSong.uploader}
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
                            aria-label={volume === 0 ? "Unmute" : "Mute"}
                            className="mt-1 rounded-full p-2 text-[#7b8493] transition hover:bg-[#eef0f4] hover:text-[#252d3b]"
                        >
                            {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                    </div>

                    <div className="mt-6">
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#e7eaf0]">
                            <div
                                className="h-full rounded-full bg-[#303b52] transition-[width] duration-200"
                                style={{ width: `${duration > 0 ? Math.min(100, (progress / duration) * 100) : 0}%` }}
                            />
                        </div>
                        <div className="mt-2 flex justify-between text-[10px] font-medium tabular-nums text-[#9299a5]">
                            <span>{formatTime(progress)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={cycleRepeat}
                            aria-label={`Repeat ${repeatMode}`}
                            className={cn("rounded-full p-2 transition hover:bg-[#eef0f4]", repeatMode === "none" ? "text-[#a0a7b2]" : "text-[#303b52]")}
                        >
                            {repeatMode === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
                        </button>
                        <button type="button" onClick={playPrevious} aria-label="Previous track" className="rounded-full p-2 text-[#596273] transition hover:bg-[#eef0f4]">
                            <SkipBack size={21} />
                        </button>
                        <button
                            type="button"
                            onClick={togglePlay}
                            aria-label={isPlaying ? "Pause" : "Play"}
                            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#202a3d] text-white shadow-md transition hover:scale-[1.04] hover:bg-[#303d55] active:scale-95"
                        >
                            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="translate-x-0.5" />}
                        </button>
                        <button type="button" onClick={playNext} aria-label="Next track" className="rounded-full p-2 text-[#596273] transition hover:bg-[#eef0f4]">
                            <SkipForward size={21} />
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate("/queue")}
                            aria-label="Open queue"
                            className="rounded-full p-2 text-[#a0a7b2] transition hover:bg-[#eef0f4] hover:text-[#303b52]"
                        >
                            <QueueIcon />
                        </button>
                    </div>

                    <div className="mt-auto pt-7">
                        <div className="rounded-2xl border border-[#eceef2] bg-white p-4">
                            <p className="text-[10px] font-bold uppercase tracking-[1.3px] text-[#a0a7b2]">Listening now</p>
                            <p className="mt-1 text-xs leading-5 text-[#778191]">Your music stays with you as you explore Melora.</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-1 flex-col items-center justify-center px-8 pb-10 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#eef0f4] text-[#9aa2af]">
                        <MusicPlaceholder />
                    </div>
                    <h3 className="mt-5 text-sm font-bold text-[#303849]">Nothing playing yet</h3>
                    <p className="mt-2 max-w-[220px] text-xs leading-5 text-[#8a93a1]">Choose a song anywhere in your library and it will appear here.</p>
                </div>
            )}
        </aside>
    )
}

function MusicPlaceholder() {
    return <svg viewBox="0 0 48 48" width="42" height="42" fill="none" aria-hidden="true"><path d="M29 8v24.5a6.5 6.5 0 1 1-3-5.5V14l15-3v17.5a6.5 6.5 0 1 1-3-5.5V8l-9 2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function QueueIcon() {
    return <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="M3 5h14M3 10h9M3 15h7m5-2 3 2-3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
