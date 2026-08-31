import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayerStatus } from 'expo-audio';
import { usePlayerStore } from '@/store/playerStore';
import { getPlayer } from '@/services/audioEngine';
import { Colors, Gradients, Spacing, Radius, FontSize } from '@/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { Glass } from '@/components/ui/Glass';
import { Artwork } from '@/components/ui/Artwork';
import { proxied } from '@/config';

function fmt(sec?: number): string {
  const s = Math.floor(sec ?? 0);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function NowPlayingScreen() {
  const navigation = useNavigation();
  const status = useAudioPlayerStatus(getPlayer());
  const currentSong = usePlayerStore((s) => s.currentSong);
  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const seek = usePlayerStore((s) => s.seek);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const volume = usePlayerStore((s) => s.volume);
  const repeat = usePlayerStore((s) => s.repeat);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const onFinished = usePlayerStore((s) => s.onFinished);
  const syncStatus = usePlayerStore((s) => s.syncStatus);

  const [barWidth, setBarWidth] = useState(0);
  const [volWidth, setVolWidth] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (status.didJustFinish) onFinished();
  }, [status.didJustFinish, onFinished]);

  useEffect(() => {
    syncStatus(status.currentTime, status.duration, status.playing);
  }, [status.currentTime, status.duration, status.playing, syncStatus]);

  if (!currentSong) return null;

  const art = proxied(currentSong.thumbnail);
  const progress = status.duration ? status.currentTime / status.duration : 0;

  const repeatIcon =
    repeat === 'one' ? 'repeat-once' : repeat === 'all' ? 'repeat' : 'repeat-off';

  return (
    <View style={styles.container}>
      <AuroraBackground uri={art} />

      <View
        style={[
          styles.content,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.topBar}>
          <Text style={styles.eyebrow}>NOW PLAYING</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
            <MaterialCommunityIcons name="chevron-down" size={30} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />

        <Glass radius={Radius.lg} elevated style={styles.panel}>
          <View style={styles.dockHead}>
            <Artwork uri={currentSong.thumbnail} size={56} radius={Radius.sm} />
            <View style={styles.dockMeta}>
              <Text style={styles.title} numberOfLines={1}>
                {currentSong.title}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {currentSong.uploader ?? currentSong.artist ?? ''}
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.progressTrack}
            onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
            onPress={(e) => {
              const w = e.nativeEvent.locationX;
              if (barWidth && status.duration) seek((w / barWidth) * status.duration);
            }}
          >
            <View style={[styles.progressFill, { width: `${Math.min(100, progress * 100)}%` }]} />
          </Pressable>
          <View style={styles.timeRow}>
            <Text style={styles.time}>{fmt(status.currentTime)}</Text>
            <Text style={styles.time}>{fmt(status.duration)}</Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity onPress={toggleShuffle}>
              <MaterialCommunityIcons
                name="shuffle"
                size={24}
                color={shuffle ? Colors.primary : Colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => previous(status.currentTime)}>
              <MaterialCommunityIcons name="skip-previous" size={36} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.playButton} onPress={toggle}>
              <LinearGradient
                colors={Gradients.brand}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <MaterialCommunityIcons
                name={status.playing ? 'pause' : 'play'}
                size={40}
                color={Colors.background}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={next}>
              <MaterialCommunityIcons name="skip-next" size={36} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={cycleRepeat}>
              <MaterialCommunityIcons
                name={repeatIcon}
                size={24}
                color={repeat === 'none' ? Colors.textSecondary : Colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.volumeRow}>
            <MaterialCommunityIcons name="volume-medium" size={20} color={Colors.textSecondary} />
            <Pressable
              style={styles.volumeTrack}
              onLayout={(e) => setVolWidth(e.nativeEvent.layout.width)}
              onPress={(e) => setVolume(Math.max(0, Math.min(1, e.nativeEvent.locationX / (volWidth || 1))))}
            >
              <View style={[styles.volumeFill, { width: `${volume * 100}%` }]} />
            </Pressable>
          </View>
        </Glass>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  eyebrow: {
    color: Colors.textSecondary,
    fontSize: FontSize.xxs,
    fontWeight: '700',
    letterSpacing: 2,
  },
  spacer: {
    flex: 1,
  },
  panel: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  dockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  dockMeta: {
    flex: 1,
    overflow: 'hidden',
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '800',
  },
  artist: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  progressTrack: {
    height: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: 5,
    backgroundColor: Colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    color: Colors.textTertiary,
    fontSize: FontSize.xs,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  playButton: {
    position: 'relative',
    width: 66,
    height: 66,
    borderRadius: Radius.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  volumeTrack: {
    flex: 1,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  volumeFill: {
    height: 4,
    backgroundColor: Colors.text,
  },
});
