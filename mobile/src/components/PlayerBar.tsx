import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudioPlayerStatus } from 'expo-audio';
import { usePlayerStore } from '@/store/playerStore';
import { getPlayer } from '@/services/audioEngine';
import { Glass } from '@/components/ui/Glass';
import { Artwork } from '@/components/ui/Artwork';
import { Colors, Gradients, Radius, FontSize, Spacing } from '@/theme';
import { proxied } from '@/config';

export function PlayerBar({ onPress }: { onPress: () => void }) {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const status = useAudioPlayerStatus(getPlayer());
  const insets = useSafeAreaInsets();

  if (!currentSong) return null;

  const title = currentSong.title;
  const artist = currentSong.uploader ?? currentSong.artist ?? '';
  const progress = status.duration ? Math.min(1, Math.max(0, status.currentTime / status.duration)) : 0;

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 92 }]} pointerEvents="box-none">
      <TouchableOpacity style={styles.pill} onPress={onPress} activeOpacity={0.9}>
        <Glass radius={Radius.lg} intensity={48} elevated style={styles.glass}>
          <View style={styles.row}>
            <Artwork uri={currentSong.thumbnail} size={46} radius={Radius.sm} />
            <View style={styles.meta}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {artist}
              </Text>
            </View>
            <View style={styles.controls}>
              <TouchableOpacity onPress={() => previous()} hitSlop={10} style={styles.sideBtn}>
                <MaterialCommunityIcons name="skip-previous" size={22} color={Colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggle} hitSlop={10} style={styles.playBtn}>
                <LinearGradient
                  colors={Gradients.brand}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                <MaterialCommunityIcons
                  name={status.playing ? 'pause' : 'play'}
                  size={20}
                  color={Colors.background}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={next} hitSlop={10} style={styles.sideBtn}>
                <MaterialCommunityIcons name="skip-next" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={Gradients.brand}
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </Glass>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 14,
    right: 14,
  },
  pill: {
    borderRadius: Radius.lg,
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  glass: {
    borderRadius: Radius.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  meta: {
    flex: 1,
    overflow: 'hidden',
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  artist: {
    color: Colors.textSecondary,
    fontSize: FontSize.xxs,
    marginTop: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sideBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  progressTrack: {
    height: 3,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
