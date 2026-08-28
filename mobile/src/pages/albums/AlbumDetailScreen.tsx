import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Artwork } from '@/components/ui/Artwork';
import { SongRow } from '@/components/SongRow';
import { GradientButton } from '@/components/ui/GradientButton';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Radius, FontSize } from '@/theme';
import { albumsApi } from '@/services/api';
import { usePlayerStore } from '@/store/playerStore';
import { proxied } from '@/config';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AlbumDetail'>;

export function AlbumDetailScreen({ route, navigation }: Props) {
  const { browseId } = route.params;
  const qc = useQueryClient();
  const playSong = usePlayerStore((s) => s.playSong);
  const { data: album, isLoading } = useQuery({
    queryKey: ['album', browseId],
    queryFn: () => albumsApi.detail(browseId),
  });

  if (isLoading || !album) {
    return (
      <Screen>
        <ScreenHeader title="Album" onBack={navigation.goBack} />
        <ActivityIndicator style={styles.loader} color={Colors.primary} />
      </Screen>
    );
  }

  const songs = album.songs ?? [];
  const toggleFav = () => {
    const fn = album.is_favorite ? albumsApi.unfavorite : albumsApi.favorite;
    void fn(browseId).then(() => qc.invalidateQueries({ queryKey: ['album', browseId] }));
  };

  return (
    <Screen backgroundUri={proxied(album.thumbnail) || undefined}>
      <ScreenHeader
        title="Album"
        onBack={navigation.goBack}
        right={
          <TouchableOpacity onPress={toggleFav} hitSlop={10}>
            <MaterialCommunityIcons
              name={album.is_favorite ? 'heart' : 'heart-outline'}
              size={24}
              color={album.is_favorite ? Colors.primary : Colors.text}
            />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Artwork uri={album.thumbnail} size={190} radius={Radius.md} />
          <Text style={styles.title} numberOfLines={2}>
            {album.title}
          </Text>
          <Text style={styles.artist}>{album.artist ?? album.artist_name ?? ''}</Text>
          <GradientButton
            title="Play"
            icon="play"
            size="lg"
            onPress={() => songs.length && void playSong(songs[0], songs, 0)}
          />
        </View>
        {songs.map((s, i) => (
          <SongRow key={s.id} song={s} index={i + 1} />
        ))}
        {songs.length === 0 ? <Text style={styles.empty}>No tracks available.</Text> : null}
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  artist: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  play: {
    marginTop: Spacing.md,
  },
  empty: {
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
