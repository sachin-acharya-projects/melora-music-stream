import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { HorizontalRow } from '@/components/ui/HorizontalRow';
import { PlaylistCard } from '@/components/ui/PlaylistCard';
import { ArtistCard } from '@/components/ui/ArtistCard';
import { AlbumCard } from '@/components/ui/AlbumCard';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, FontSize } from '@/theme';
import { playlistsApi, artistsApi, albumsApi } from '@/services/api';
import { proxied } from '@/config';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function LibraryScreen() {
  const navigation = useNavigation<Nav>();
  const qc = useQueryClient();

  const playlists = useQuery({ queryKey: ['playlists'], queryFn: () => playlistsApi.list({ limit: 30 }) });
  const artists = useQuery({ queryKey: ['followingArtists'], queryFn: artistsApi.following });
  const albums = useQuery({ queryKey: ['favoriteAlbums'], queryFn: albumsApi.favorites });

  const bg = proxied(playlists.data?.[0]?.thumbnail);

  const createPlaylist = async () => {
    const p = await playlistsApi.create('New Playlist');
    await qc.invalidateQueries({ queryKey: ['playlists'] });
    navigation.navigate('PlaylistDetail', { id: p.id });
  };

  return (
    <Screen backgroundUri={bg || undefined}>
      <SectionHeader
        title="Your Library"
        icon="book"
        actionLabel="+ New"
        onPress={createPlaylist}
      />

      {playlists.isLoading ? (
        <ActivityIndicator style={styles.loader} color={Colors.primary} />
      ) : (
        <>
          <SectionHeader title="Playlists" />
          <HorizontalRow>
            {playlists.data?.map((p) => (
              <PlaylistCard key={p.id} playlist={p} onPress={() => navigation.navigate('PlaylistDetail', { id: p.id })} />
            ))}
            <TouchableOpacity style={styles.createTile} onPress={createPlaylist}>
              <MaterialCommunityIcons name="plus-box" size={48} color={Colors.textTertiary} />
              <Text style={styles.createText}>New playlist</Text>
            </TouchableOpacity>
          </HorizontalRow>
        </>
      )}

      <SectionHeader title="Artists you follow" />
      {artists.isLoading ? (
        <ActivityIndicator style={styles.loader} color={Colors.primary} />
      ) : (
        <HorizontalRow>
          {artists.data?.map((a) => (
            <ArtistCard key={a.id} artist={a} onPress={() => navigation.navigate('ArtistDetail', { slug: a.slug ?? a.id })} />
          ))}
          {artists.data?.length === 0 ? <Text style={styles.empty}>Follow artists to see them here</Text> : null}
        </HorizontalRow>
      )}

      <SectionHeader title="Favorite albums" />
      {albums.isLoading ? (
        <ActivityIndicator style={styles.loader} color={Colors.primary} />
      ) : (
        <HorizontalRow>
          {albums.data?.map((al) => (
            <AlbumCard key={al.browse_id ?? al.id} album={al} onPress={() => navigation.navigate('AlbumDetail', { browseId: al.browse_id ?? al.id })} />
          ))}
          {albums.data?.length === 0 ? <Text style={styles.empty}>No favorite albums yet</Text> : null}
        </HorizontalRow>
      )}

      <SectionHeader title="More" />
      <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('History')}>
        <MaterialCommunityIcons name="history" size={22} color={Colors.primary} />
        <Text style={styles.linkText}>Listening history</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Stats')}>
        <MaterialCommunityIcons name="chart-bar" size={22} color={Colors.primary} />
        <Text style={styles.linkText}>Your stats</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.lg },
  createTile: {
    width: 148,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface2,
    borderRadius: 12,
    marginRight: Spacing.md,
  },
  createText: {
    color: Colors.textTertiary,
    fontSize: FontSize.xs,
  },
  empty: {
    color: Colors.textTertiary,
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.md,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  linkText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
