import { FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SongRow } from '@/components/SongRow';
import { Screen } from '@/components/ui/Screen';
import { BACKGROUNDS } from '@/config/backgrounds';
import { Colors, Spacing } from '@/theme';
import { historyApi } from '@/services/api';

export function HistoryScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: () => historyApi.list({ limit: 100 }),
  });

  return (
    <Screen source={BACKGROUNDS.history}>
      <SectionHeader title="Listening History" icon="history" />
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={Colors.primary} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <SongRow song={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<SectionHeader title="Nothing here yet" />}
        />
      )}
    </Screen>
  );
}

const styles = {
  loader: { marginTop: Spacing.xl },
  list: { paddingBottom: Spacing.xxl },
} as const;
