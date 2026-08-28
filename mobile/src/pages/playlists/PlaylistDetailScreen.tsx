import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Artwork } from '@/components/ui/Artwork';
import { SongRow } from '@/components/SongRow';
import { GradientButton } from '@/components/ui/GradientButton';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Radius, FontSize } from '@/theme';
import { playlistsApi } from '@/services/api';
import { usePlayerStore } from '@/store/playerStore';
import { proxied } from '@/config';
import type { RootStackParamList } from '@/navigation/types';
import type { Song } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlaylistDetail'>;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function PlaylistDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const qc = useQueryClient();
  const playSong = usePlayerStore((s) => s.playSong);
  const setQueue = usePlayerStore((s) => s.setQueue);

  const { data: playlist, isLoading } = useQuery({
    queryKey: ['playlist', id],
    queryFn: () => playlistsApi.detail(id, { limit: 300 }),
  });

  const songs = playlist?.songs ?? [];

  const playAll = () => {
    if (songs.length) void playSong(songs[0], songs, 0);
  };
  const shuffleAll = () => {
    if (songs.length) void setQueue(shuffle(songs), 0);
  };

  const openMenu = () => {
    Alert.alert(playlist?.name ?? 'Playlist', undefined, [
      {
        text: 'Sync from source',
        onPress: () => {
          void playlistsApi.sync(id).then(() => qc.invalidateQueries({ queryKey: ['playlist', id] }));
        },
      },
      {
        text: 'Share link',
        onPress: () => {
          void playlistsApi.share(id).then((r) =>
            Alert.alert('Share token', r.token)
          );
        },
      },
      {
        text: 'Follow',
        onPress: () => {
          void playlistsApi.follow(id).then(() => qc.invalidateQueries({ queryKey: ['playlist', id] }));
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete playlist?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => {
                void playlistsApi.remove(id).then(() => navigation.goBack());
              },
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onMore = (song: Song) => {
    Alert.alert(song.title, undefined, [
      { text: 'Play', onPress: () => void playSong(song, songs, songs.indexOf(song)) },
      {
        text: 'Remove from playlist',
        style: 'destructive',
        onPress: () => {
          void playlistsApi.removeSong(id, song.id).then(() =>
            qc.invalidateQueries({ queryKey: ['playlist', id] })
          );
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (isLoading || !playlist) {
    return (
      <Screen>
        <ScreenHeader title="Playlist" onBack={navigation.goBack} />
        <ActivityIndicator style={styles.loader} color={Colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen backgroundUri={proxied(playlist.thumbnail) || undefined}>
      <ScreenHeader title="Playlist" onBack={navigation.goBack} right={
        <TouchableOpacity onPress={openMenu} hitSlop={10}>
          <MaterialCommunityIcons name="dots-vertical" size={24} color={Colors.text} />
        </TouchableOpacity>
      } />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Artwork uri={playlist.thumbnail} size={180} radius={Radius.md} />
          <Text style={styles.name} numberOfLines={2}>
            {playlist.name}
          </Text>
          {playlist.description ? (
            <Text style={styles.desc} numberOfLines={3}>
              {playlist.description}
            </Text>
          ) : null}
          <Text style={styles.meta}>
            {songs.length} {songs.length === 1 ? 'track' : 'tracks'}
          </Text>
          <View style={styles.actions}>
            <GradientButton title="Play" icon="play" onPress={playAll} style={styles.play} />
            <TouchableOpacity style={styles.secondary} onPress={shuffleAll}>
              <MaterialCommunityIcons name="shuffle" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        {songs.map((s, i) => (
          <SongRow key={s.id} song={s} index={i + 1} onMore={onMore} />
        ))}
        {songs.length === 0 ? <Text style={styles.empty}>This playlist is empty.</Text> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.xl },
  content: {
    paddingBottom: Spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  name: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  desc: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  meta: {
    color: Colors.textTertiary,
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  play: {
    flex: 1,
  },
  secondary: {
    backgroundColor: Colors.surface2,
    borderRadius: Radius.full,
    padding: Spacing.sm,
  },
  empty: {
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
