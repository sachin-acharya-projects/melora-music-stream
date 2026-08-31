import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing, FontSize } from '@/theme';
import { MENU_ITEMS } from '@/config/menu';

interface AppTabBarProps {
  state: { index: number; routes: { name: string }[] };
  navigation: { navigate: (name: string) => void };
}

export function AppTabBar({ state, navigation }: AppTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeIndex = state.index;

  return (
    <BlurView intensity={28} tint="dark" style={styles.blur}>
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
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
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blur: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10,10,14,0.72)',
  },
  container: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
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
    minWidth: 56,
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
