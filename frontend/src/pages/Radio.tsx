import { SongSection } from "@/components/song-section/song-section"
import {
    useGenerateRadio,
    useRadioGenres,
    useRadioMoods,
    useRadioSeeds,
} from "@/hooks/useRecommendations"
import { usePlayerStore } from "@/hooks/usePlayer"
import { useTitle } from "@/hooks/useTitle"
import type { RadioResponse, RadioSeedType } from "@/services/recommendations.service"
import { type ArtistSong } from "@/types"
import { MESSAGES } from "@/utils/messages"
import {
    Loader2,
    Play,
    Radio as RadioIcon,
    Search,
    Shuffle,
    Sparkles,
    X,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "react-toastify"

const toPlayable = (songs: ArtistSong[]) => songs.map((s) => ({ ...s, created_at: s.created_at ?? "" }))

const SURPRISE_MAX_GENRES = 3
const GENRE_PREVIEW_LIMIT = 12

export default function Radio() {
    useTitle("Radio")
    const setPlaylist = usePlayerStore((s) => s.setPlaylist)
    const { data: moods, isLoading: moodsLoading } = useRadioMoods()
    const { data: genres, isLoading: genresLoading } = useRadioGenres()
    const { data: seeds } = useRadioSeeds()
    const generate = useGenerateRadio()
    const [station, setStation] = useState<RadioResponse | null>(null)
    const [generatingFor, setGeneratingFor] = useState<string | null>(null)
    const [selectedGenres, setSelectedGenres] = useState<string[]>([])
    const [genreQuery, setGenreQuery] = useState("")
    const [showAllGenres, setShowAllGenres] = useState(false)

    const genreNames = useMemo(
        () => (genres ?? []).map((genre) => genre.name),
        [genres],
    )

    const filteredGenres = useMemo(() => {
        const query = genreQuery.trim().toLowerCase()
        if (!query) return genreNames
        return genreNames.filter((name) => name.toLowerCase().includes(query))
    }, [genreNames, genreQuery])

    const visibleGenres = useMemo(() => {
        if (genreQuery.trim() || showAllGenres) return filteredGenres
        return filteredGenres.slice(0, GENRE_PREVIEW_LIMIT)
    }, [filteredGenres, genreQuery, showAllGenres])

    const toggleGenre = (name: string) => {
        setSelectedGenres((current) =>
            current.includes(name)
                ? current.filter((g) => g !== name)
                : [...current, name],
        )
    }

    const handleGenerate = async (seedType: RadioSeedType, seedValue: string) => {
        setGeneratingFor(`${seedType}:${seedValue}`)
        try {
            const result = await generate.mutateAsync({ seedType, seedValue })
            setStation(result)
            const songs = toPlayable(result.songs)
            if (songs.length > 0) {
                setPlaylist(songs, 0, `radio:${seedType}:${seedValue}`)
            }
        } catch {
            toast.error(MESSAGES.RADIO_GENERATE_FAILED)
        } finally {
            setGeneratingFor(null)
        }
    }

    const handleStartMix = () => {
        if (selectedGenres.length > 0) {
            void handleGenerate("genre", selectedGenres.join(","))
        }
    }

    const handleSurprise = () => {
        if (genreNames.length === 0) return
        const shuffled = [...genreNames].sort(() => Math.random() - 0.5)
        const picks = shuffled.slice(0, SURPRISE_MAX_GENRES)
        setSelectedGenres(picks)
        void handleGenerate("genre", picks.join(","))
    }

    const handleShuffle = () => {
        if (!station || station.songs.length === 0) return
        const songs = toPlayable(station.songs)
        for (let i = songs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[songs[i], songs[j]] = [songs[j], songs[i]]
        }
        setPlaylist(songs, 0, `radio:${station.seed_type}:${station.seed_value}`)
    }

    const genreChips = seeds?.genres ?? []
    const artistChips = seeds?.top_artists ?? []

    return (
        <div className='mx-auto w-full max-w-375 px-4 pt-4 pb-40'>
            <div className='mb-8'>
                <h1 className='text-3xl font-bold dark:text-white'>
                    Melora <span className='text-red-500'>Radio</span>
                </h1>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                    Pick a mood, a genre (or a few), or a seed from your library to start a station
                </p>
            </div>

            {moodsLoading ? (
                <div className='flex justify-center py-20'>
                    <Loader2 className='h-10 w-10 animate-spin text-red-600' />
                </div>
            ) : (
                <>
                    <section className='mb-10'>
                        <h2 className='mb-4 text-lg font-bold dark:text-white'>Moods</h2>
                        <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4'>
                            {(moods ?? []).map((mood) => {
                                const active = generatingFor === `mood:${mood.id}`
                                return (
                                    <button
                                        key={mood.id}
                                        type='button'
                                        disabled={active}
                                        onClick={() => handleGenerate("mood", mood.id)}
                                        className='dark:bg-card group flex cursor-pointer flex-col items-start gap-2 rounded-xl border border-gray-200 bg-white p-5 text-left transition-all hover:-translate-y-1 hover:border-red-300 hover:shadow-md disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:hover:border-red-800'
                                    >
                                        <span className='flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white transition-colors group-hover:bg-red-700 max-md:bg-red-600 max-md:text-white dark:bg-red-600 dark:text-white dark:group-hover:bg-red-700'>
                                            {active ? (
                                                <Loader2 className='h-5 w-5 animate-spin' />
                                            ) : (
                                                <RadioIcon className='h-5 w-5' />
                                            )}
                                        </span>
                                        <span className='text-sm font-semibold dark:text-white'>
                                            {mood.label}
                                        </span>
                                        <span className='line-clamp-2 text-xs text-gray-500 dark:text-gray-400'>
                                            {mood.genres.join(" · ")}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </section>

                    <section className='mb-10'>
                        <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
                            <div>
                                <h2 className='text-lg font-bold dark:text-white'>Browse genres</h2>
                                <p className='mt-0.5 text-xs text-gray-500 dark:text-gray-400'>
                                    Pick one or several genres to mix into a single station
                                </p>
                            </div>
                            {selectedGenres.length > 0 && (
                                <div className='flex items-center gap-2'>
                                    <button
                                        type='button'
                                        onClick={() => setSelectedGenres([])}
                                        className='dark:bg-card flex h-9 cursor-pointer items-center gap-1 rounded-xl border bg-white px-3 text-sm font-medium transition-all hover:border-red-200 dark:border-white/10 dark:text-white'
                                        title='Clear selection'
                                    >
                                        <X className='h-4 w-4' />
                                        Clear
                                    </button>
                                    <button
                                        type='button'
                                        onClick={handleStartMix}
                                        disabled={generatingFor === `genre:${selectedGenres.join(",")}`}
                                        className='flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-all hover:bg-red-700 active:scale-95 disabled:cursor-wait disabled:opacity-60'
                                    >
                                        {generatingFor === `genre:${selectedGenres.join(",")}` ? (
                                            <Loader2 className='h-4 w-4 animate-spin' />
                                        ) : (
                                            <Play className='h-4 w-4 fill-current' />
                                        )}
                                        Start mix ({selectedGenres.length})
                                    </button>
                                </div>
                            )}
                        </div>

                        {genresLoading ? (
                            <div className='flex justify-center py-10'>
                                <Loader2 className='h-8 w-8 animate-spin text-red-600' />
                            </div>
                        ) : (genres ?? []).length === 0 ? (
                            <p className='text-sm text-gray-500 dark:text-gray-400'>
                                Genre catalog unavailable right now.
                            </p>
                        ) : (
                            <>
                                <div className='relative mb-4'>
                                    <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400' />
                                    <input
                                        type='text'
                                        value={genreQuery}
                                        onChange={(e) => setGenreQuery(e.target.value)}
                                        placeholder='Filter genres…'
                                        className='dark:bg-card h-9 w-full max-w-64 cursor-text rounded-xl border bg-white pr-3 pl-9 text-sm transition-all focus:border-red-400 focus:outline-none dark:border-white/10 dark:text-white'
                                    />
                                </div>
                                {filteredGenres.length === 0 ? (
                                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                                        No genres match "{genreQuery}".
                                    </p>
                                ) : (
                                    <>
                                        <div className='flex flex-wrap items-center gap-2'>
                                            {visibleGenres.map((genre) => {
                                                const selected = selectedGenres.includes(genre)
                                                const active = generatingFor === `genre:${genre}`
                                                return (
                                                    <button
                                                        key={genre}
                                                        type='button'
                                                        disabled={active}
                                                        onClick={() => toggleGenre(genre)}
                                                        className={`flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-all disabled:cursor-wait disabled:opacity-60 ${
                                                            selected
                                                                ? "border-red-500 bg-red-600 text-white"
                                                                : "dark:bg-card border bg-white hover:border-red-300 hover:text-red-500 dark:border-white/10 dark:text-white"
                                                        }`}
                                                    >
                                                        {active && (
                                                            <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                                        )}
                                                        {selected && <span>✓</span>}
                                                        {genre}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                        {!genreQuery.trim() && genreNames.length > GENRE_PREVIEW_LIMIT && (
                                            <button
                                                type='button'
                                                onClick={() => setShowAllGenres((s) => !s)}
                                                className='dark:bg-card mt-3 flex h-9 cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium transition-all hover:border-red-300 hover:text-red-500 dark:border-white/10 dark:text-white'
                                            >
                                                {showAllGenres
                                                    ? "Show less"
                                                    : `Show all (${genreNames.length})`}
                                            </button>
                                        )}
                                    </>
                                )}
                                <button
                                    type='button'
                                    onClick={handleSurprise}
                                    disabled={genreNames.length === 0}
                                    className='dark:bg-card mt-4 flex h-9 cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium transition-all hover:border-red-300 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-white'
                                >
                                    <Sparkles className='h-4 w-4 text-red-500' />
                                    Surprise me
                                </button>
                            </>
                        )}
                    </section>

                    <section className='mb-10'>
                        <h2 className='mb-4 text-lg font-bold dark:text-white'>
                            Start from your library
                        </h2>
                        <div className='flex flex-col gap-5'>
                            {genreChips.length > 0 && (
                                <div className='flex flex-wrap items-center gap-2'>
                                    <span className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                                        Genres
                                    </span>
                                    {genreChips.map((genre) => (
                                        <button
                                            key={genre}
                                            type='button'
                                            disabled={generatingFor === `genre:${genre}`}
                                            onClick={() => handleGenerate("genre", genre)}
                                            className='dark:bg-card flex cursor-pointer items-center gap-1 rounded-full border bg-white px-3 py-1.5 text-sm font-medium transition-all hover:border-red-300 hover:text-red-500 disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:text-white'
                                        >
                                            {generatingFor === `genre:${genre}` && (
                                                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                            )}
                                            {genre}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {artistChips.length > 0 && (
                                <div className='flex flex-wrap items-center gap-2'>
                                    <span className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                                        Top artists
                                    </span>
                                    {artistChips.map((artist) => (
                                        <button
                                            key={artist.name}
                                            type='button'
                                            disabled={generatingFor === `artist:${artist.name}`}
                                            onClick={() => handleGenerate("artist", artist.name)}
                                            className='dark:bg-card flex cursor-pointer items-center gap-1 rounded-full border bg-white px-3 py-1.5 text-sm font-medium transition-all hover:border-red-300 hover:text-red-500 disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:text-white'
                                        >
                                            {generatingFor === `artist:${artist.name}` && (
                                                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                            )}
                                            {artist.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {genreChips.length === 0 && artistChips.length === 0 && (
                                <p className='text-sm text-gray-500 dark:text-gray-400'>
                                    Add favorite genres in your profile or play a few songs to get
                                    personal seeds.
                                </p>
                            )}
                        </div>
                    </section>

                    {station && (
                        <section>
                            <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
                                <h2 className='text-lg font-bold capitalize dark:text-white'>
                                    {station.seed_type} · {station.seed_value}
                                </h2>
                                <button
                                    type='button'
                                    onClick={handleShuffle}
                                    className='flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-all hover:bg-red-700 active:scale-95'
                                >
                                    <Shuffle className='h-4 w-4' />
                                    Shuffle station
                                </button>
                            </div>
                            <SongSection
                                title='Now on air'
                                songs={station.songs}
                                onPlay={(songs, index) => {
                                    const playable = toPlayable(songs)
                                    setPlaylist(
                                        playable,
                                        index,
                                        `radio:${station.seed_type}:${station.seed_value}`,
                                    )
                                }}
                            />
                        </section>
                    )}
                </>
            )}
        </div>
    )
}
