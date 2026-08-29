import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudioPlayerStatus } from 'expo-audio';
import { usePlayerStore } from '@/store/playerStore';
import { getPlayer } from '@/services/audioEngine';
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
    const a1 = loop(v1, 420);
    const a2 = loop(v2, 560);
    const a3 = loop(v3, 360);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [active, v1, v2, v3]);

  return (
    <View style={styles.eq} pointerEvents="none">
      <Animated.View style={[styles.eqBar, { transform: [{ scaleY: v1 }] }]} />
      <Animated.View style={[styles.eqBar, { transform: [{ scaleY: v2 }] }]} />
      <Animated.View style={[styles.eqBar, { transform: [{ scaleY: v3 }] }]} />
    </View>
  );
}

export function PlayerBar({ onPress }: { onPress: () => void }) {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const toggle = usePlayerStore((s) => s.toggle);
  const status = useAudioPlayerStatus(getPlayer());
  const insets = useSafeAreaInsets();

  if (!currentSong) return null;

  const title = currentSong.title;
  const artist = currentSong.uploader ?? currentSong.artist ?? '';
  const duration = status.duration ?? 0;
  const current = status.currentTime ?? 0;
  const progress = duration ? Math.min(1, Math.max(0, current / duration)) : 0;
  const playing = !!status.playing;

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      <View style={styles.progressRow}>
        <Text style={styles.time}>{formatTime(current)}</Text>
        <View style={styles.track}>
          <LinearGradient
            colors={Gradients.brand}
            style={[styles.fill, { width: `${progress * 100}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <View style={[styles.thumb, { left: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.time}>{formatTime(duration)}</Text>
      </View>

      <TouchableOpacity style={styles.main} onPress={onPress} activeOpacity={0.9}>
        <Artwork uri={currentSong.thumbnail} size={46} radius={Radius.sm} />
        <View style={styles.meta}>
          <View style={styles.titleRow}>
            {playing ? <Equalizer active={playing} /> : null}
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
          <Text style={styles.artist} numberOfLines={1}>
            {artist}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.playBtn}
          onPress={(e) => {
            e.stopPropagation();
            toggle();
          }}
          activeOpacity={0.8}
          hitSlop={10}
        >
          <LinearGradient
            colors={Gradients.brand}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <MaterialCommunityIcons
            name={playing ? 'pause' : 'play'}
            size={20}
            color={Colors.background}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  time: {
    color: Colors.textSecondary,
    fontSize: FontSize.xxs,
    fontVariant: ['tabular-nums'],
    minWidth: 32,
    textAlign: 'center',
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    top: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: -4,
    shadowColor: Colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
  },
  meta: {
    flex: 1,
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    flex: 1,
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
  eq: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 14,
    width: 16,
  },
  eqBar: {
    width: 3,
    height: '100%',
    borderRadius: 1.5,
    backgroundColor: Colors.primary,
  },
});
