import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudioPlayerStatus } from 'expo-audio';
import { usePlayerStore } from '@/store/playerStore';
import { getPlayer } from '@/services/audioEngine';
import { Artwork } from '@/components/ui/Artwork';
import { useSongActionSheet } from '@/components/ui/SongActionSheet';
import { Colors, Spacing, Radius, FontSize } from '@/theme';
import type { Song } from '@/types';

interface SongRowProps {
  song: Song;
  index?: number;
  removable?: 'playlist' | 'queue';
  onRemove?: (song: Song) => void;
}

export function SongRow({ song, index, removable, onRemove }: SongRowProps) {
  const playSong = usePlayerStore((s) => s.playSong);
  const toggle = usePlayerStore((s) => s.toggle);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const pendingSongId = usePlayerStore((s) => s.pendingSongId);
  const status = useAudioPlayerStatus(getPlayer());
  const { open } = useSongActionSheet();

  const isCurrent = currentSong?.id === song.id;
  const playing = isCurrent && status.playing;
  const loading = pendingSongId === song.id || (isCurrent && isPlaying && !status.playing);

  const onPlay = () => {
    if (isCurrent) toggle();
    else void playSong(song);
  };

  const trailing = loading ? (
    <ActivityIndicator size="small" color={Colors.primary} />
  ) : (
    <MaterialCommunityIcons
      name={playing ? 'pause' : 'play'}
      size={26}
      color={playing ? Colors.primary : Colors.textSecondary}
    />
  );

  return (
    <TouchableOpacity style={styles.row} onPress={onPlay} activeOpacity={0.7}>
        <View style={styles.artWrap}>
          <Artwork uri={song.thumbnail} size={48} radius={Radius.sm} />
          {isCurrent ? (
            <View style={styles.equalizer}>
              <MaterialCommunityIcons name="music-note" size={16} color={Colors.primary} />
            </View>
          ) : null}
        </View>
        <View style={styles.meta}>
          <Text style={[styles.title, isCurrent && styles.titleActive]} numberOfLines={1}>
            {index ? `${index}. ` : ''}
            {song.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {song.uploader ?? song.artist ?? ''}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={onPlay} hitSlop={12} activeOpacity={0.6}>
            {trailing}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => open({ song, removable, onRemove })}
            hitSlop={10}
            activeOpacity={0.6}
          >
            <MaterialCommunityIcons name="dots-vertical" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  artWrap: {
    position: 'relative',
  },
  equalizer: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    padding: 2,
  },
  meta: {
    flex: 1,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  titleActive: {
    color: Colors.primary,
  },
  artist: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
  },
});
