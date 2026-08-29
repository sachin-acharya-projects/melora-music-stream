import { useMemo, useState } from 'react';
import { View, Text, FlatList, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { discoverApi, releasesApi, albumsApi, artistsApi } from '@/services/api';
import { SongRow } from '@/components/SongRow';
import { AlbumCard } from '@/components/ui/AlbumCard';
import { PlaylistCard } from '@/components/ui/PlaylistCard';
import { ArtistCard } from '@/components/ui/ArtistCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Screen } from '@/components/ui/Screen';
import { BACKGROUNDS } from '@/config/backgrounds';
import { Colors, Spacing, FontSize, Radius } from '@/theme';
import type { RootStackParamList, BrowseParams, BrowseKind } from '@/navigation/types';
import type { IconName } from '@/config/menu';
import type { Song, Album, Playlist, Artist } from '@/types';

type BrowseItem = Song | Album | Playlist | Artist;

const BROWSE_LIMIT = 50;

function fetchBySource(source: BrowseParams['source']): Promise<BrowseItem[]> {
  switch (source) {
    case 'trending':
      return discoverApi
        .feed({ top_songs_limit: BROWSE_LIMIT })
        .then((f) => (f.top_songs ?? []) as BrowseItem[]);
    case 'moodPlaylists':
      return discoverApi
        .feed({ mood_playlists_limit: BROWSE_LIMIT })
        .then((f) => (f.mood_playlists ?? []) as BrowseItem[]);
    case 'releases':
      return releasesApi.list({ limit: 100 }).then((s) => s as BrowseItem[]);
    case 'albumsFavorites':
      return albumsApi.favorites().then((a) => a as BrowseItem[]);
    case 'artistsFeatured':
      return artistsApi.featured().then((a) => a as BrowseItem[]);
  }
}

function searchText(item: BrowseItem, kind: BrowseKind): string {
  switch (kind) {
    case 'songs':
      return `${(item as Song).title} ${(item as Song).artist ?? ''}`;
    case 'albums':
      return (item as Album).title;
    case 'playlists':
      return (item as Playlist).name;
    case 'artists':
      return (item as Artist).name;
  }
}

function itemKey(item: BrowseItem): string {
  const any = item as { id?: string; browse_id?: string; slug?: string };
  return any.id ?? any.browse_id ?? any.slug ?? Math.random().toString();
}

export function BrowseScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Browse'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { title, icon, kind, source } = route.params;

  const { data, isLoading } = useQuery({
    queryKey: ['browse', source],
    queryFn: () => fetchBySource(source),
  });

  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim() || !data) return data ?? [];
    const needle = query.toLowerCase();
    return data.filter((item) => searchText(item, kind).toLowerCase().includes(needle));
  }, [data, query, kind]);

  const renderItem = ({ item }: { item: BrowseItem }) => {
    switch (kind) {
      case 'songs':
        return <SongRow song={item as Song} />;
      case 'albums': {
        const a = item as Album;
        return (
          <AlbumCard
            album={a}
            onPress={() => navigation.navigate('AlbumDetail', { browseId: a.browse_id })}
          />
        );
      }
      case 'playlists': {
        const p = item as Playlist;
        return (
          <PlaylistCard
            playlist={p}
            onPress={() => navigation.navigate('PlaylistDetail', { id: p.id })}
          />
        );
      }
      case 'artists': {
        const ar = item as Artist;
        return (
          <ArtistCard
            artist={ar}
            onPress={() => navigation.navigate('ArtistDetail', { slug: ar.slug })}
          />
        );
      }
    }
  };

  return (
    <Screen source={BACKGROUNDS.discover}>
      <View style={styles.page}>
        <SectionHeader title={title} icon={icon as IconName} />
        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder={`Filter ${title.toLowerCase()}`}
            placeholderTextColor={Colors.textSecondary}
            clearButtonMode="while-editing"
          />
        </View>
        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={Colors.primary} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={itemKey}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.empty}>No results{query ? ` for "${query}"` : ''}</Text>
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
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  empty: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontSize: FontSize.md,
  },
});
