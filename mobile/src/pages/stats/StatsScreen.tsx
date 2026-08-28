import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Radius, FontSize } from '@/theme';
import { statsApi } from '@/services/api';

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.barValue}>{value}</Text>
    </View>
  );
}

export function StatsScreen({ navigation }: { navigation: any }) {
  const overview = useQuery({ queryKey: ['stats'], queryFn: statsApi.overview });
  const topArtists = useQuery({ queryKey: ['statsArtists'], queryFn: statsApi.topArtists });
  const topSongs = useQuery({ queryKey: ['statsSongs'], queryFn: statsApi.topSongs });
  const topGenres = useQuery({ queryKey: ['statsGenres'], queryFn: statsApi.topGenres });

  const maxArtist = Math.max(1, ...(topArtists.data ?? []).map((a) => a.count));
  const maxSong = Math.max(1, ...(topSongs.data ?? []).map((s) => s.count));
  const maxGenre = Math.max(1, ...(topGenres.data ?? []).map((g) => g.count));

  const o = overview.data as Record<string, number> | undefined;

  return (
    <Screen>
      <ScreenHeader title="Your Stats" onBack={navigation.goBack} />
      {overview.isLoading ? (
        <ActivityIndicator style={styles.loader} color={Colors.primary} />
      ) : (
        <View style={styles.content}>
          <View style={styles.cards}>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="play-circle" size={22} color={Colors.primary} />
              <Text style={styles.statNum}>{o?.total_plays ?? 0}</Text>
              <Text style={styles.statLabel}>Plays</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="clock-outline" size={22} color={Colors.primary} />
              <Text style={styles.statNum}>{o?.total_minutes ?? 0}</Text>
              <Text style={styles.statLabel}>Minutes</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="music" size={22} color={Colors.primary} />
              <Text style={styles.statNum}>{o?.unique_songs ?? 0}</Text>
              <Text style={styles.statLabel}>Songs</Text>
            </View>
          </View>

          <Text style={styles.section}>Top artists</Text>
          {(topArtists.data ?? []).map((a) => (
            <Bar key={a.name} label={a.name} value={a.count} max={maxArtist} />
          ))}

          <Text style={styles.section}>Top songs</Text>
          {(topSongs.data ?? []).map((s) => (
            <Bar key={s.title} label={s.title} value={s.count} max={maxSong} />
          ))}

          <Text style={styles.section}>Top genres</Text>
          {(topGenres.data ?? []).map((g) => (
            <Bar key={g.genre} label={g.genre} value={g.count} max={maxGenre} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.xl },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  cards: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface2,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statNum: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
  statLabel: { color: Colors.textTertiary, fontSize: FontSize.xs },
  section: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  barLabel: { width: 110, color: Colors.text, fontSize: FontSize.xs },
  barTrack: { flex: 1, height: 8, backgroundColor: Colors.surface2, borderRadius: 4 },
  barFill: { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  barValue: { width: 36, textAlign: 'right', color: Colors.textTertiary, fontSize: FontSize.xs },
});
