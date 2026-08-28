import { View, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SongRow } from '@/components/SongRow';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing } from '@/theme';
import { releasesApi } from '@/services/api';
import { proxied } from '@/config';

export function ReleasesScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['releases'],
    queryFn: () => releasesApi.list({ limit: 100 }),
  });

  return (
    <Screen backgroundUri={proxied(data?.[0]?.thumbnail) || undefined}>
      <SectionHeader title="New Releases" icon="album" subtitle="Fresh from the artists you follow" />
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={Colors.primary} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <SongRow song={item} />}
          contentContainerStyle={styles.list}
        />
      )}
    </Screen>
  );
}

const styles = {
  loader: { marginTop: Spacing.xl },
  list: { paddingBottom: Spacing.xxl },
} as const;
