import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize } from '@/theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress?: () => void;
  actionLabel?: string;
}

export function SectionHeader({
  title,
  subtitle,
  icon,
  onPress,
  actionLabel = 'See all',
}: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={styles.accent} />
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {onPress ? (
        <TouchableOpacity onPress={onPress} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  accent: {
    width: 4,
    height: 22,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: Colors.textTertiary,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  action: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
