import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '@/store/playerStore';
import { getPlayer } from '@/services/audioEngine';
import { useAudioPlayerStatus } from 'expo-audio';
import { Artwork } from '@/components/ui/Artwork';
import { Colors, Radius, Spacing, FontSize } from '@/theme';
import { Gradients } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { MENU_ITEMS } from '@/config/menu';
import { useBlurTarget } from '@/components/ui/BlurTargetProvider';
import { SafeBlurView } from '@/components/ui/SafeBlurView';

interface AppTabBarProps {
  state: { index: number; routes: { name: string }[] };
  navigation: { navigate: (name: string) => void };
}

export function AppTabBar({ state, navigation }: AppTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeIndex = state.index;
  const isHome = activeIndex === 0;
  const blurRef = useBlurTarget();

  const currentSong = usePlayerStore((s) => s.currentSong);
  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const status = useAudioPlayerStatus(getPlayer());

  const playing = currentSong ? !!status.playing : false;
  const duration = status.duration ?? 0;
  const current = status.currentTime ?? 0;
  const progress = duration ? Math.min(1, Math.max(0, current / duration)) : 0;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < queue.length - 1;

  if (isHome && currentSong) {
    return (
      <SafeBlurView intensity={28} tint="dark" blurMethod="dimezisBlurViewSdk31Plus" blurTarget={blurRef} style={styles.blur}>
        <View style={[styles.unified, { paddingBottom: insets.bottom + Spacing.xs }]}>
          <View style={styles.playerRow}>
            <Artwork uri={currentSong.thumbnail} size={44} radius={Radius.xs} />
            <View style={styles.playerMeta}>
              <Text style={styles.playerTitle} numberOfLines={1}>{currentSong.title}</Text>
              <Text style={styles.playerArtist} numberOfLines={1}>
                {currentSong.uploader ?? currentSong.artist ?? ''}
              </Text>
            </View>
            <View style={styles.controls}>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); previous(); }}
                hitSlop={10}
                activeOpacity={0.6}
                disabled={!hasPrev}
                style={styles.skipBtn}
              >
                <MaterialCommunityIcons name="skip-previous" size={22} color={hasPrev ? Colors.text : Colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={(e) => { e.stopPropagation(); toggle(); }} style={styles.playBtn} activeOpacity={0.8}>
                <LinearGradient colors={Gradients.brand} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                <MaterialCommunityIcons name={playing ? 'pause' : 'play'} size={18} color={Colors.background} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); next(); }}
                hitSlop={10}
                activeOpacity={0.6}
                disabled={!hasNext}
                style={styles.skipBtn}
              >
                <MaterialCommunityIcons name="skip-next" size={22} color={hasNext ? Colors.text : Colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.trackBar}>
            <LinearGradient
              colors={Gradients.brand}
              style={[styles.trackFill, { width: `${progress * 100}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            {MENU_ITEMS.map((item, i) => {
              const active = i === activeIndex;
              return (
                <TouchableOpacity
                  key={item.name}
                  style={styles.tabItem}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate(item.name)}
                >
                  <View style={[styles.pill, active && styles.pillActive]}>
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={20}
                      color={active ? Colors.primary : Colors.textSecondary}
                    />
                  </View>
                  <Text style={[styles.label, active && styles.labelActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </SafeBlurView>
    );
  }

  return (
    <SafeBlurView intensity={28} tint="dark" blurMethod="dimezisBlurViewSdk31Plus" blurTarget={blurRef} style={styles.blur}>
      <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.xs, marginHorizontal: Spacing.sm, marginBottom: Spacing.xs, borderRadius: Radius.lg, overflow: 'hidden' }]}>
        <View style={styles.row}>
          {MENU_ITEMS.map((item, i) => {
            const active = i === activeIndex;
            return (
              <TouchableOpacity
                key={item.name}
                style={styles.tabItem}
                activeOpacity={0.7}
                onPress={() => navigation.navigate(item.name)}
              >
                <View style={[styles.pill, active && styles.pillActive]}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={22}
                    color={active ? Colors.primary : Colors.textSecondary}
                  />
                </View>
                <Text style={[styles.label, active && styles.labelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeBlurView>
  );
}

const styles = StyleSheet.create({
  blur: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  unified: {
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
    borderRadius: Radius.lg,
    backgroundColor: Colors.glassStrong,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  playerMeta: {
    flex: 1,
  },
  playerTitle: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  playerArtist: {
    color: Colors.textSecondary,
    fontSize: FontSize.xxs,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  skipBtn: {
    padding: Spacing.xxs,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trackBar: {
    height: 2,
    marginHorizontal: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  trackFill: {
    height: '100%',
    borderRadius: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: Spacing.sm,
  },
  container: {
    backgroundColor: Colors.glassStrong,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  tabItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xxs,
    minWidth: 52,
  },
  pill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.full,
  },
  pillActive: {
    backgroundColor: 'rgba(52,224,161,0.14)',
  },
  label: {
    fontSize: FontSize.xxs,
    marginTop: 2,
    color: Colors.textSecondary,
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
