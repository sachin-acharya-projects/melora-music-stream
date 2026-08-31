import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePlayerStore } from '@/store/playerStore';
import { getPlayer } from '@/services/audioEngine';
import { useAudioPlayerStatus } from 'expo-audio';
import { Artwork } from '@/components/ui/Artwork';
import { Colors, Gradients, Radius, FontSize, Spacing } from '@/theme';

function formatTime(s?: number): string {
  if (!s || !isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function Equalizer({ active }: { active: boolean }) {
  const v1 = useRef(new Animated.Value(0.3)).current;
  const v2 = useRef(new Animated.Value(0.3)).current;
  const v3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!active) {
      [v1, v2, v3].forEach((v) =>
        Animated.timing(v, { toValue: 0.3, duration: 200, useNativeDriver: true }).start(),
      );
      return;
    }
    const loop = (v: Animated.Value, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: dur, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: dur, useNativeDriver: true }),
        ]),
      );
    loop(v1, 420);
    loop(v2, 560);
    loop(v3, 360);
  }, [active, v1, v2, v3]);

  return (
    <View style={styles.eq} pointerEvents="none">
      <Animated.View style={[styles.eqBar, { transform: [{ scaleY: v1 }] }]} />
      <Animated.View style={[styles.eqBar, { transform: [{ scaleY: v2 }] }]} />
      <Animated.View style={[styles.eqBar, { transform: [{ scaleY: v3 }] }]} />
    </View>
  );
}

export function BottomPlayer({ onPress }: { onPress: () => void }) {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const toggle = usePlayerStore((s) => s.toggle);
  const status = useAudioPlayerStatus(getPlayer());

  if (!currentSong) return null;

  const title = currentSong.title;
  const artist = currentSong.uploader ?? currentSong.artist ?? '';
  const duration = status.duration ?? 0;
  const current = status.currentTime ?? 0;
  const progress = duration ? Math.min(1, Math.max(0, current / duration)) : 0;
  const playing = !!status.playing;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.container}>
      <View style={styles.inner}>
        <Artwork uri={currentSong.thumbnail} size={56} radius={Radius.sm} />
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <View style={styles.artistRow}>
            <Text style={styles.artist} numberOfLines={1}>{artist}</Text>
            {playing && <Equalizer active={playing} />}
          </View>
        </View>
        <TouchableOpacity onPress={(e) => { e.stopPropagation(); toggle(); }} style={styles.playBtn} activeOpacity={0.8}>
          <LinearGradient colors={Gradients.brand} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          <MaterialCommunityIcons name={playing ? 'pause' : 'play'} size={22} color={Colors.background} />
        </TouchableOpacity>
      </View>
      <View style={styles.trackContainer}>
        <Text style={styles.time}>{formatTime(current)}</Text>
        <View style={styles.track}>
          <LinearGradient colors={Gradients.brand} style={[styles.fill, { width: `${progress * 100}%` }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
        </View>
        <Text style={styles.time}>{formatTime(duration)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60 + Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.glassStrong,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    zIndex: 10,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.xs,
  },
  meta: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  artist: {
    color: Colors.textSecondary,
    fontSize: FontSize.xxs,
  },
  eq: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
    height: 12,
  },
  eqBar: {
    width: 2.5,
    height: 12,
    backgroundColor: Colors.primary,
    borderRadius: 1,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
    paddingTop: 2,
  },
  track: {
    height: 3,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  time: {
    color: Colors.textTertiary,
    fontSize: FontSize.xxs,
  },
});