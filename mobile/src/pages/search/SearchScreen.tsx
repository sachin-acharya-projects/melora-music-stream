import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SearchBar } from '@/components/ui/SearchBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { HorizontalRow } from '@/components/ui/HorizontalRow';
import { SongRow } from '@/components/SongRow';
import { ArtistCard } from '@/components/ui/ArtistCard';
import { AlbumCard } from '@/components/ui/AlbumCard';
import { PlaylistCard } from '@/components/ui/PlaylistCard';
import { Screen } from '@/components/ui/Screen';
import { BACKGROUNDS } from '@/config/backgrounds';
import { Colors, Spacing, FontSize } from '@/theme';
import { searchApi, artistsApi, albumsApi, playlistsApi } from '@/services/api';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const [q, setQ] = useState('');

  const history = useQuery({
    queryKey: ['searchHistory'],
    queryFn: searchApi.history,
    enabled: q.trim().length === 0,
  });

  const results = useQuery({
    queryKey: ['search', q],
    queryFn: () => searchApi.query(q),
    enabled: q.trim().length > 0,
  });


  if (q.trim().length === 0) {
    return (
      <Screen source={BACKGROUNDS.search}>
        <View style={styles.searchWrap}>
          <SearchBar value={q} onChange={setQ} />
        </View>
        <SectionHeader title="Recent searches" />
        {history.isLoading ? (
          <ActivityIndicator style={styles.loader} color={Colors.primary} />
        ) : (
          <View style={styles.chips}>
            {history.data?.map((h) => (
              <TouchableOpacity
                key={h.id}
                style={styles.chip}
                onPress={() => setQ(h.query)}
              >
                <MaterialCommunityIcons name="history" size={16} color={Colors.textTertiary} />
                <Text style={styles.chipText} numberOfLines={1}>
                  {h.query}
                </Text>
                <MaterialCommunityIcons
                  name="close"
                  size={14}
                  color={Colors.textTertiary}
                  onPress={() => void searchApi.deleteHistory(h.id)}
                />
              </TouchableOpacity>
            ))}
            {history.data && history.data.length > 0 ? (
              <TouchableOpacity style={styles.clear} onPress={() => void searchApi.clearHistory()}>
                <Text style={styles.clearText}>Clear all</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.empty}>No recent searches</Text>
            )}
          </View>
        )}
        <SectionHeader title="Browse" subtitle="Jump into your library" />
        <TouchableOpacity
          style={styles.browseItem}
          onPress={() => navigation.navigate('LibraryTab' as never)}
        >
          <MaterialCommunityIcons name="playlist-music" size={22} color={Colors.primary} />
          <Text style={styles.browseText}>Playlists</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.browseItem}
          onPress={() => navigation.navigate('RadioTab' as never)}
        >
          <MaterialCommunityIcons name="radio" size={22} color={Colors.primary} />
          <Text style={styles.browseText}>Radio</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  return (
    <Screen source={BACKGROUNDS.search}>
      <View style={styles.searchWrap}>
        <SearchBar value={q} onChange={setQ} />
      </View>
      {results.isLoading ? (
        <ActivityIndicator style={styles.loader} color={Colors.primary} />
      ) : (
        <FlatList
          data={results.data?.songs ?? []}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <SongRow song={item} />}
          ListHeaderComponent={
            <View>
              {results.data?.artists && results.data.artists.length > 0 ? (
                <>
                  <SectionHeader title="Artists" />
                  <HorizontalRow>
                    {results.data.artists.map((a) => (
                      <ArtistCard
                        key={a.id}
                        artist={a}
                        onPress={() => navigation.navigate('ArtistDetail', { slug: a.slug ?? a.id })}
                      />
                    ))}
                  </HorizontalRow>
                </>
              ) : null}
              {results.data?.albums && results.data.albums.length > 0 ? (
                <>
                  <SectionHeader title="Albums" />
                  <HorizontalRow>
                    {results.data.albums.map((al) => (
                      <AlbumCard
                        key={al.browse_id ?? al.id}
                        album={al}
                        onPress={() => navigation.navigate('AlbumDetail', { browseId: al.browse_id ?? al.id })}
                      />
                    ))}
                  </HorizontalRow>
                </>
              ) : null}
              {results.data?.playlists && results.data.playlists.length > 0 ? (
                <>
                  <SectionHeader title="Playlists" />
                  <HorizontalRow>
                    {results.data.playlists.map((p) => (
                      <PlaylistCard
                        key={p.id}
                        playlist={p}
                        onPress={() => navigation.navigate('PlaylistDetail', { id: p.id })}
                      />
                    ))}
                  </HorizontalRow>
                </>
              ) : null}
              <SectionHeader title="Songs" />
            </View>
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No results for “{q}”</Text>}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  loader: {
    marginTop: Spacing.xl,
  },
  chips: {
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surface2,
    borderRadius: 999,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    maxWidth: 220,
  },
  chipText: {
    color: Colors.text,
    fontSize: FontSize.sm,
  },
  clear: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  clearText: {
    color: Colors.textTertiary,
    fontSize: FontSize.sm,
    textDecorationLine: 'underline',
  },
  empty: {
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  browseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  browseText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  list: {
    paddingBottom: Spacing.xxl,
  },
});
