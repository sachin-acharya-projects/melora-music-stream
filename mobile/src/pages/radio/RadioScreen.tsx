import { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SongRow } from '@/components/SongRow';
import { GradientButton } from '@/components/ui/GradientButton';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Radius, FontSize } from '@/theme';
import { radioApi } from '@/services/api';
import { usePlayerStore } from '@/store/playerStore';
import type { RadioSeed, Song } from '@/types';
import { queryKeys } from '@/config/domains';
import { RADIO_SEED_GROUPS } from '@/pages/radio/config';

export function RadioScreen() {
  const playSong = usePlayerStore((s) => s.playSong);
  const [seed, setSeed] = useState<RadioSeed | null>(null);
  const [station, setStation] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);

  const genres = useQuery({ queryKey: queryKeys.radio.genres, queryFn: radioApi.genres });
  const moods = useQuery({ queryKey: queryKeys.radio.moods, queryFn: radioApi.moods });
  const seeds = useQuery({ queryKey: queryKeys.radio.seeds, queryFn: radioApi.seeds });

  const generate = async () => {
    if (!seed) return;
    setLoading(true);
    try {
      const s = await radioApi.generate(seed, 20);
      setStation(s);
    } finally {
      setLoading(false);
    }
  };

  const chip = (label: string, value: RadioSeed) => {
    const active = seed?.type === value.type && seed?.value === value.value;
    return (
      <TouchableOpacity
        key={`${value.type}:${value.value}`}
        style={[styles.chip, active && styles.chipActive]}
        onPress={() => setSeed(value)}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      <SectionHeader title="Radio" icon="radio" subtitle="Generate a station from a seed" />
      <Text style={styles.label}>{RADIO_SEED_GROUPS.genres.label}</Text>
      <View style={styles.chipsWrap}>
        {genres.data?.map((g) => chip(g.name, { type: 'genre', value: g.name }))}
      </View>
      <Text style={styles.label}>{RADIO_SEED_GROUPS.moods.label}</Text>
      <View style={styles.chipsWrap}>
        {moods.data?.map((m) => chip(m.name, { type: 'mood', value: m.name }))}
      </View>
      <Text style={styles.label}>{RADIO_SEED_GROUPS.artists.label}</Text>
      <View style={styles.chipsWrap}>
        {seeds.data?.top_artists.map((a) => chip(a.name, { type: 'artist', value: a.id }))}
      </View>

      <GradientButton
        title={loading ? 'Generating…' : seed ? `Start ${seed.type} station` : 'Pick a seed'}
        icon="radio"
        onPress={seed ? generate : () => Alert.alert('Pick a seed', 'Choose a genre, mood or artist first.')}
        style={styles.generate}
      />

      {loading ? (
        <ActivityIndicator style={styles.loader} color={Colors.primary} />
      ) : (
        <FlatList
          data={station}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <SongRow song={item} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            station.length > 0 ? (
              <GradientButton
                title="Play station"
                icon="play"
                onPress={() => station.length && void playSong(station[0], station, 0)}
                style={styles.playStation}
              />
            ) : null
          }
          ListEmptyComponent={<Text style={styles.empty}>Pick a seed and start a station.</Text>}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  chip: {
    backgroundColor: Colors.surface2,
    borderRadius: Radius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  chipActive: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    color: Colors.text,
    fontSize: FontSize.sm,
  },
  chipTextActive: {
    color: Colors.background,
    fontWeight: '700',
  },
  generate: {
    margin: Spacing.lg,
  },
  loader: { marginTop: Spacing.lg },
  list: { paddingBottom: Spacing.xxl },
  playStation: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  empty: {
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
