import { useMemo, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TextInput, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SongRow } from '@/components/SongRow';
import { Screen } from '@/components/ui/Screen';
import { BACKGROUNDS } from '@/config/backgrounds';
import { Colors, Spacing, FontSize, Radius } from '@/theme';
import { releasesApi } from '@/services/api';

export function ReleasesScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['releases'],
    queryFn: () => releasesApi.list({ limit: 100 }),
  });
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim() || !data) return data ?? [];
    const needle = query.toLowerCase();
    return data.filter((s) =>
      `${s.title} ${s.artist ?? ''}`.toLowerCase().includes(needle),
    );
  }, [data, query]);

  return (
    <Screen source={BACKGROUNDS.releases}>
      <View style={styles.page}>
        <SectionHeader title="New Releases" icon="album" subtitle="Fresh from the artists you follow" />
        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Filter songs"
            placeholderTextColor={Colors.textSecondary}
            clearButtonMode="while-editing"
          />
        </View>
        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={Colors.primary} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(s) => s.id}
            renderItem={({ item }) => <SongRow song={item} />}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No results for "{query}"</Text>
              </View>
            }
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
  },
  search: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
    paddingVertical: Spacing.xs,
  },
  loader: { marginTop: Spacing.xl },
  list: { paddingBottom: Spacing.xxl },
  empty: { marginTop: Spacing.xl },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', fontSize: FontSize.md },
});

