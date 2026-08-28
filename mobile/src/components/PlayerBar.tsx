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
  const status = useAudioPlayerStatus(getPlayer());
  const insets = useSafeAreaInsets();

  if (!currentSong) return null;

  const art = proxied(currentSong.thumbnail);
  const title = currentSong.title;
  const artist = currentSong.uploader ?? currentSong.artist ?? '';

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 92 }]} pointerEvents="box-none">
      <TouchableOpacity style={styles.pill} onPress={onPress} activeOpacity={0.9}>
        <Glass radius={Radius.full} intensity={42} style={styles.glass}>
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
            <TouchableOpacity onPress={toggle} hitSlop={14} style={styles.playBtn}>
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
    borderRadius: Radius.full,
    shadowColor: '#34E0A1',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  glass: {
    borderRadius: Radius.full,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 9,
    paddingHorizontal: 12,
    paddingRight: 14,
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
  playBtn: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
