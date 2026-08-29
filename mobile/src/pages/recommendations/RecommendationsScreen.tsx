import { View, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SongRow } from '@/components/SongRow';
import { Screen } from '@/components/ui/Screen';
import { BACKGROUNDS } from '@/config/backgrounds';
import { Colors, Spacing } from '@/theme';
import { recommendationsApi } from '@/services/api';

export function RecommendationsScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => recommendationsApi.list(40),
  });

  return (
    <Screen source={BACKGROUNDS.recommendations}>
      <SectionHeader title="Made for you" icon="star" subtitle="Recommended from your taste" />
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
