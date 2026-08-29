import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { HorizontalRow } from '@/components/ui/HorizontalRow';
import { SongRow } from '@/components/SongRow';
import { AlbumCard } from '@/components/ui/AlbumCard';
import { PlaylistCard } from '@/components/ui/PlaylistCard';
import { Screen } from '@/components/ui/Screen';
import { BACKGROUNDS } from '@/config/backgrounds';
import { Colors, Spacing, FontSize } from '@/theme';
import { discoverApi } from '@/services/api';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function DiscoverScreen() {
  const navigation = useNavigation<Nav>();
  const { data, isLoading } = useQuery({ queryKey: ['discover'], queryFn: discoverApi.feed });

  return (
    <Screen source={BACKGROUNDS.discover}>
      <SectionHeader title="Discover" icon="compass" />
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={Colors.primary} />
      ) : (
        <View>
          <SectionHeader title="Trending now" />
          {(data?.trending ?? []).map((s) => (
            <SongRow key={s.id} song={s} />
          ))}

          {data?.new_releases && data.new_releases.length > 0 ? (
            <>
              <SectionHeader title="New releases" />
              <HorizontalRow>
                {data.new_releases.map((al) => (
                  <AlbumCard
                    key={al.browse_id}
                    album={al}
                    onPress={() => navigation.navigate('AlbumDetail', { browseId: al.browse_id })}
                  />
                ))}
              </HorizontalRow>
            </>
          ) : null}

          {data?.mood_playlists && data.mood_playlists.length > 0 ? (
            <>
              <SectionHeader title="Mood playlists" />
              <HorizontalRow>
                {data.mood_playlists.map((p) => (
                  <PlaylistCard
                    key={p.id}
                    playlist={p}
                    onPress={() => navigation.navigate('PlaylistDetail', { id: p.id })}
                  />
                ))}
              </HorizontalRow>
            </>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.xl },
});
