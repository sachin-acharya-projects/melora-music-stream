import { useState, useRef } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePlayerStore } from '@/store/playerStore';
import { Colors, Gradients, Radius, Spacing } from '@/theme';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import { MENU_CONFIG, MENU_ITEMS, type MenuItem } from '@/config/menu';

const ITEM = MENU_CONFIG.ITEM_SIZE;
const R = MENU_CONFIG.RADIUS;

export function ExpandableMenu() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const currentSong = usePlayerStore((s) => s.currentSong);
  const [open, setOpen] = useState(false);
  const fabProgress = useRef(new Animated.Value(0)).current;
  const itemProgressRef = useRef<Animated.Value[] | null>(null);
  if (!itemProgressRef.current) {
    itemProgressRef.current = MENU_ITEMS.map(() => new Animated.Value(0));
  }
  const itemProgress = itemProgressRef.current;

  const width = Dimensions.get('window').width;
  const fabBottomClosed =
    insets.bottom + (currentSong ? MENU_CONFIG.FAB_BOTTOM_PLAYING_OFFSET : MENU_CONFIG.FAB_BOTTOM_CLOSED_OFFSET);
  const fabBottomOpen = insets.bottom + MENU_CONFIG.FAB_BOTTOM_OPEN_OFFSET;
  const openCenterY = fabBottomOpen + 30;
  const cornerFabRight = Spacing.lg + 30;
  const cornerFabCenterBottom = fabBottomClosed + 30;
  const centerTranslateX = -width / 2 + Spacing.lg + 30;
  const n = MENU_ITEMS.length;

  // Two phases overlap: the primary phase gets a short lead, then the secondary
  // phase runs in parallel so there is almost no idle gap between them.
  const runAnimation = (next: boolean) => {
    setOpen(next);
    const fab = Animated.spring(fabProgress, {
      toValue: next ? 1 : 0,
      useNativeDriver: true,
      ...MENU_CONFIG.BUTTON_SPRING,
    });
    const items = Animated.stagger(
      MENU_CONFIG.ITEM_STAGGER_MS,
      itemProgress.map((p) =>
        Animated.spring(p, { toValue: next ? 1 : 0, useNativeDriver: true, ...MENU_CONFIG.ITEM_SPRING }),
      ),
    );
    const lead = Animated.delay(MENU_CONFIG.FAN_LEAD_MS);
    const anim = next
      ? Animated.parallel([fab, Animated.sequence([lead, items])])
      : Animated.parallel([items, Animated.sequence([lead, fab])]);
    anim.start();
  };

  const toggle = () => runAnimation(!open);
  const choose = (name: keyof TabParamList) => {
    runAnimation(false);
    navigation.navigate('TabRoot', { screen: name });
  };

  const backdropOpacity = fabProgress;
  const fabRotate = fabProgress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const fabTx = fabProgress.interpolate({ inputRange: [0, 1], outputRange: [0, centerTranslateX] });
  // NOTE: positive translateY moves an element DOWN (toward the bottom edge),
  // so to raise the FAB we interpolate toward a NEGATIVE delta.
  const fabTy = fabProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, fabBottomClosed - fabBottomOpen],
  });

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable style={StyleSheet.absoluteFill} onPress={toggle} />
      </Animated.View>

      {MENU_ITEMS.map((it, i) => {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const angleDeg = MENU_CONFIG.ARC_CENTER_DEGREES + (t - 0.5) * MENU_CONFIG.ARC_DEGREES;
        const theta = (angleDeg * Math.PI) / 180;
        const dx = R * Math.cos(theta);
        const dy = R * Math.sin(theta);
        const openRight = width / 2 - dx - ITEM / 2;
        const openBottom = openCenterY - dy - ITEM / 2;
        const right = Math.min(width - ITEM / 2 - 8, Math.max(ITEM / 2 + 8, openRight));
        const centerRight = width / 2 - ITEM / 2;
        const centerBottom = openCenterY - ITEM / 2;
        const cornerRight = cornerFabRight - ITEM / 2;
        const cornerBottom = cornerFabCenterBottom - ITEM / 2;
        const p = itemProgress[i];
        // Ride: item follows the FAB from the corner to the center as the button slides.
        const rideX = fabProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [cornerRight - right, right - centerRight],
        });
        const rideY = fabProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [cornerBottom - openBottom, openBottom - centerBottom],
        });
        // Fan: item blooms outward from the centered FAB to its arc slot (scale + fade in).
        const fanX = p.interpolate({ inputRange: [0, 1], outputRange: [0, centerRight - right] });
        const fanY = p.interpolate({ inputRange: [0, 1], outputRange: [0, centerBottom - openBottom] });
        const scale = p.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
        return (
          <Animated.View
            key={it.name}
            style={[
              styles.orbitItem,
              {
                right,
                bottom: openBottom,
                opacity: p,
                transform: [
                  { translateX: Animated.add(rideX, fanX) },
                  { translateY: Animated.add(rideY, fanY) },
                  { scale },
                ],
              },
            ]}
            pointerEvents={open ? 'auto' : 'none'}
          >
            <TouchableOpacity style={styles.orbitBtn} onPress={() => choose(it.name)} activeOpacity={0.85}>
              <MaterialCommunityIcons name={it.icon} size={24} color={Colors.text} />
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      <Animated.View
        style={[
          styles.fabWrap,
          { bottom: fabBottomClosed, transform: [{ translateX: fabTx }, { translateY: fabTy }, { rotate: fabRotate }] },
        ]}
      >
        <TouchableOpacity style={styles.fab} onPress={toggle} activeOpacity={0.9}>
          <LinearGradient
            colors={Gradients.brand}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <Animated.View style={[styles.fabIcon, { transform: [{ rotate: fabRotate }] }]}>
            <MaterialCommunityIcons name="plus" size={30} color={Colors.background} />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(4,4,8,0.35)',
  },
  orbitItem: {
    position: 'absolute',
    width: ITEM,
    height: ITEM,
  },
  orbitBtn: {
    width: ITEM,
    height: ITEM,
    borderRadius: Radius.full,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  fabWrap: {
    position: 'absolute',
    right: Spacing.lg,
    width: 60,
    height: 60,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#34E0A1',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  fabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
