import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudioPlayerStatus } from 'expo-audio';
import { usePlayerStore } from '@/store/playerStore';
import { getPlayer } from '@/services/audioEngine';
import { Artwork } from '@/components/ui/Artwork';
import { Colors, Gradients, Spacing, Radius, FontSize } from '@/theme';
import type { Song } from '@/types';

interface SongRowProps {
  song: Song;
  index?: number;
  onMore?: (song: Song) => void;
}

export function SongRow({ song, index, onMore }: SongRowProps) {
  const playSong = usePlayerStore((s) => s.playSong);
  const toggle = usePlayerStore((s) => s.toggle);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isCurrent = currentSong?.id === song.id;
  const status = useAudioPlayerStatus(getPlayer());
  const progress = status.duration ? status.currentTime / status.duration : 0;

  const playing = isCurrent && status.playing;
  const loading = isCurrent && isPlaying && !status.playing;

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
      {onMore ? (
        <TouchableOpacity onPress={() => onMore(song)} hitSlop={10}>
          <MaterialCommunityIcons name="dots-vertical" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={onPlay} hitSlop={12} activeOpacity={0.6}>
          {trailing}
        </TouchableOpacity>
      )}
      {isCurrent ? (
        <>
          <LinearGradient
            colors={Gradients.brand}
            style={styles.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={[styles.progressBar, { width: `${Math.min(100, progress * 100)}%` }]} />
        </>
      ) : null}
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
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.38,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderTopLeftRadius: Radius.md,
    borderBottomLeftRadius: Radius.md,
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 2.5,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: Radius.md,
    borderBottomRightRadius: Radius.md,
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
