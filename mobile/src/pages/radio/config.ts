import type { RadioSeed } from '@/types';

/** Supported radio seed kinds, as a type-safe const union. */
export const RADIO_SEED_TYPES = ['genre', 'mood', 'artist', 'song'] as const;
export type RadioSeedType = (typeof RADIO_SEED_TYPES)[keyof typeof RADIO_SEED_TYPES];

/** Seed picker groups shown on the Radio screen. */
export const RADIO_SEED_GROUPS = {
  genres: { label: 'Genres', type: 'genre' as RadioSeedType },
  moods: { label: 'Moods', type: 'mood' as RadioSeedType },
  artists: { label: 'Artists', type: 'artist' as RadioSeedType },
} as const;

export type RadioSeedGroup = (typeof RADIO_SEED_GROUPS)[keyof typeof RADIO_SEED_GROUPS];
