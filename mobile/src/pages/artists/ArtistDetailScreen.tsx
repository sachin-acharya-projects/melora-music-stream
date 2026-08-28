import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Artwork } from '@/components/ui/Artwork';
import { SongRow } from '@/components/SongRow';
import { HorizontalRow } from '@/components/ui/HorizontalRow';
import { AlbumCard } from '@/components/ui/AlbumCard';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Radius, FontSize } from '@/theme';
import { artistsApi } from '@/services/api';
import { usePlayerStore } from '@/store/playerStore';
import { proxied } from '@/config';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ArtistDetail'>;

export function ArtistDetailScreen({ route, navigation }: Props) {
  const { slug } = route.params;
  const qc = useQueryClient();
  const playSong = usePlayerStore((s) => s.playSong);
  const { data: artist, isLoading } = useQuery({
    queryKey: ['artist', slug],
    queryFn: () => artistsApi.detail(slug),
  });
  const { data: songs } = useQuery({
    queryKey: ['artistSongs', slug],
    queryFn: () => artistsApi.songs(slug),
  });
  const { data: albums } = useQuery({
    queryKey: ['artistAlbums', slug],
    queryFn: () => artistsApi.albums(slug),
  });

  if (isLoading || !artist) {
    return (
      <Screen>
        <ScreenHeader title="Artist" onBack={navigation.goBack} />
        <ActivityIndicator style={styles.loader} color={Colors.primary} />
      </Screen>
    );
  }

  const follow = () => {
    void artistsApi.follow(artist.id).then(() =>
      Alert.alert(artist.following ? 'Unfollowed' : 'Following', artist.name)
    );
  };

  return (
    <Screen backgroundUri={proxied(artist.thumbnail) || undefined}>
      <ScreenHeader title="Artist" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Artwork uri={artist.thumbnail} size={150} radius={75} />
          <Text style={styles.name} numberOfLines={2}>
            {artist.name}
          </Text>
          {artist.bio ? (
            <Text style={styles.bio} numberOfLines={4}>
              {artist.bio}
            </Text>
          ) : null}
          <TouchableOpacity style={styles.follow} onPress={follow}>
            <MaterialCommunityIcons
              name={artist.following ? 'account-check' : 'account-plus'}
              size={18}
              color={Colors.text}
            />
            <Text style={styles.followText}>{artist.following ? 'Following' : 'Follow'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Top tracks</Text>
        {(songs ?? []).map((s, i) => (
          <SongRow key={s.id} song={s} index={i + 1} />
        ))}

        {albums && albums.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Albums</Text>
            <HorizontalRow>
              {albums.map((al) => (
                <AlbumCard
                  key={al.browse_id ?? al.id}
                  album={al}
                  onPress={() => navigation.navigate('AlbumDetail', { browseId: al.browse_id ?? al.id })}
                />
              ))}
            </HorizontalRow>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.xl },
  content: { paddingBottom: Spacing.xxl },
  hero: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  name: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  bio: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  follow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    backgroundColor: Colors.surface2,
    borderRadius: Radius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  followText: {
    color: Colors.text,
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
});
