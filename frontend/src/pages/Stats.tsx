import { ListeningChart } from "@/components/listening-chart/listening-chart"
import { StatsCard } from "@/components/stats-card/stats-card"
import { useRecalculateStats, useStats } from "@/hooks/useStats"
import { useTitle } from "@/hooks/useTitle"
import { formatPlayTime, formatTotalPlayTime } from "@/lib/utils"
import { usePlayerStore } from "@/hooks/usePlayer"
import { type StatSong } from "@/types"
import { Activity, Clock, Loader2, Mic2, Music2, RefreshCw, TrendingUp } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

const toSong = (song: StatSong) => ({
    id: song.id,
    title: song.title ?? "",
    uploader: song.uploader ?? "",
    thumbnail: song.thumbnail ?? "",
    duration: song.duration ?? 0,
    created_at: "",
})

export default function Stats() {
    useTitle("Stats")
    const navigate = useNavigate()
    const { data, isLoading } = useStats()
    const recalculate = useRecalculateStats()
    const setPlaylist = usePlayerStore((s) => s.setPlaylist)

    const [songPage, setSongPage] = useState(1)

    if (isLoading && !data) {
        return (
            <div className='flex justify-center pt-20'>
                <Loader2 className='h-12 w-12 animate-spin text-red-600' />
            </div>
        )
    }

    const stats = data ?? {
        total_plays: 0,
        total_play_time: 0,
        plays_last_30_days: [],
        top_songs: [],
        top_artists: [],
        genres: [],
        cached: false,
    }

    const topSongs = stats.top_songs ?? []
    const topArtists = stats.top_artists ?? []
    const genres = stats.genres ?? []
    const maxArtistPlays = Math.max(1, ...topArtists.map((a) => a.plays))
    const maxGenrePlays = Math.max(1, ...genres.map((g) => g.plays))

    const SONGS_PER_PAGE = 10
    const totalSongPages = Math.max(1, Math.ceil(topSongs.length / SONGS_PER_PAGE))

    if (songPage > totalSongPages) {
        setSongPage(totalSongPages)
    }

    const safePage = Math.min(songPage, totalSongPages)
    const pagedTopSongs = topSongs.slice((safePage - 1) * SONGS_PER_PAGE, safePage * SONGS_PER_PAGE)

    return (
        <div className='mx-auto w-full max-w-375 px-4 pt-4 pb-40'>
            <div className='mb-8 flex flex-wrap items-end justify-between gap-4'>
                <div>
                    <h1 className='text-3xl font-bold dark:text-white'>
                        Your <span className='text-red-500'>Stats</span>
                    </h1>
                    <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                        How you listen, at a glance
                    </p>
                </div>
                <button
                    onClick={() => recalculate.mutate()}
                    disabled={recalculate.isPending}
                    className='dark:bg-card flex h-10 cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium transition-all hover:border-red-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-white'
                >
                    <RefreshCw
                        className={`h-4 w-4 text-red-500 ${recalculate.isPending ? "animate-spin" : ""}`}
                    />
                    Refresh
                </button>
            </div>

            <div className='mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3'>
                <StatsCard
                    icon={Activity}
                    label='Total Plays'
                    value={stats.total_plays.toLocaleString()}
                />
                <StatsCard
                    icon={Clock}
                    label='Play Time'
                    value={formatTotalPlayTime(stats.total_play_time)}
                    hint={`~${formatPlayTime(stats.total_play_time)} all time`}
                />
                <StatsCard
                    icon={TrendingUp}
                    label='Last 30 Days'
                    value={stats.plays_last_30_days
                        .reduce((acc, d) => acc + d.plays, 0)
                        .toLocaleString()}
                    hint={`${stats.plays_last_30_days.length} active days`}
                />
            </div>

            <div className='mb-8'>
                <h2 className='mb-4 text-lg font-bold dark:text-white'>Listening Activity</h2>
                <div className='dark:bg-card rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10'>
                    <ListeningChart data={stats.plays_last_30_days ?? []} />
                </div>
            </div>

            <div className='grid grid-cols-1 gap-8 lg:grid-cols-2'>
                <section>
                    <h2 className='mb-4 text-lg font-bold dark:text-white'>Top Artists</h2>
                    {topArtists.length === 0 ? (
                        <p className='py-10 text-center text-sm text-gray-400'>No data yet.</p>
                    ) : (
                        <div className='dark:bg-card flex max-h-[560px] flex-col gap-2 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10'>
                            {topArtists.map((artist, index) => (
                                <button
                                    key={artist.name}
                                    onClick={() =>
                                        navigate(
                                            `/artists/${artist.name
                                                .toLowerCase()
                                                .replace(/[^a-z0-9]+/g, "-")
                                                .replace(/^-|-$/g, "")}`,
                                        )
                                    }
                                    className='flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5'
                                >
                                    <span className='w-5 text-sm font-bold text-gray-400'>
                                        {index + 1}
                                    </span>
                                    <div className='flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-red-600 text-sm font-bold text-white'>
                                        {artist.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className='min-w-0 flex-1'>
                                        <div className='flex items-center justify-between gap-2'>
                                            <p className='truncate text-sm font-semibold dark:text-white'>
                                                {artist.name}
                                            </p>
                                            <p className='shrink-0 text-xs text-gray-400'>
                                                {artist.plays}{" "}
                                                {artist.plays === 1 ? "play" : "plays"}
                                            </p>
                                        </div>
                                        <div className='mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10'>
                                            <div
                                                className='h-full rounded-full bg-red-500'
                                                style={{
                                                    width: `${(artist.plays / maxArtistPlays) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                <section>
                    <h2 className='mb-4 text-lg font-bold dark:text-white'>Top Songs</h2>
                    {topSongs.length === 0 ? (
                        <p className='py-10 text-center text-sm text-gray-400'>No data yet.</p>
                    ) : (
                        <div className='dark:bg-card flex max-h-[560px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10'>
                            <div className='flex flex-col gap-2 overflow-y-auto p-2'>
                                {pagedTopSongs.map((entry) => (
                                    <div
                                        key={entry.song.id}
                                        onClick={() =>
                                            setPlaylist(
                                                topSongs.map((e) => toSong(e.song)),
                                                0,
                                                "stats",
                                            )
                                        }
                                        className='group flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-white p-2 transition-all hover:border-red-200 dark:border-white/10'
                                    >
                                        {entry.song.thumbnail ? (
                                            <img
                                                src={entry.song.thumbnail}
                                                alt={entry.song.title ?? ""}
                                                loading='lazy'
                                                decoding='async'
                                                referrerPolicy='no-referrer'
                                                className='h-10 w-10 shrink-0 rounded-lg object-cover'
                                            />
                                        ) : (
                                            <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-400 to-red-600'>
                                                <Music2 className='h-5 w-5 text-white' />
                                            </span>
                                        )}
                                        <div className='min-w-0 flex-1'>
                                            <p className='truncate text-sm font-semibold dark:text-white'>
                                                {entry.song.title || "Unknown Title"}
                                            </p>
                                            <p className='truncate text-xs text-gray-500 dark:text-gray-400'>
                                                {entry.song.uploader || "Unknown Artist"}
                                            </p>
                                        </div>
                                        <span className='shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-950 dark:text-red-400'>
                                            {entry.count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {totalSongPages > 1 && (
                                <div className='flex items-center justify-between border-t border-gray-100 px-3 py-2.5 dark:border-white/10'>
                                    <button
                                        onClick={() => setSongPage((p) => Math.max(1, p - 1))}
                                        disabled={safePage <= 1}
                                        className='cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-white/10'
                                    >
                                        Previous
                                    </button>
                                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                                        Page {safePage} of {totalSongPages}
                                    </span>
                                    <button
                                        onClick={() =>
                                            setSongPage((p) => Math.min(totalSongPages, p + 1))
                                        }
                                        disabled={safePage >= totalSongPages}
                                        className='cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-white/10'
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </div>

            <section className='mt-8'>
                <h2 className='mb-4 text-lg font-bold dark:text-white'>Top Genres</h2>
                {genres.length === 0 ? (
                    <p className='py-10 text-center text-sm text-gray-400'>
                        No genre data yet. Listen to more music to see your genre breakdown.
                    </p>
                ) : (
                    <div className='flex flex-wrap gap-2'>
                        {genres.map((genre) => (
                            <div
                                key={genre.name}
                                className='dark:bg-card flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-white/10'
                            >
                                <Mic2 className='h-4 w-4 text-red-500' />
                                <span className='text-sm font-medium capitalize dark:text-white'>
                                    {genre.name}
                                </span>
                                <div className='h-1.5 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10'>
                                    <div
                                        className='h-full rounded-full bg-red-500'
                                        style={{
                                            width: `${(genre.plays / maxGenrePlays) * 100}%`,
                                        }}
                                    />
                                </div>
                                <span className='text-xs text-gray-400'>{genre.plays}</span>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
