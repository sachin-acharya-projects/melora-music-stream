import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Artwork } from '@/components/ui/Artwork';
import { Colors, Radius, FontSize, Spacing } from '@/theme';

interface MediaTileProps {
  uri?: string;
  title: string;
  subtitle?: string;
  size: number;
  radius?: number;
  circular?: boolean;
  onPress: () => void;
}

export function MediaTile({ uri, title, subtitle, size, radius = Radius.md, circular, onPress }: MediaTileProps) {
  if (circular) {
    return (
      <TouchableOpacity style={[styles.card, { width: size }]} onPress={onPress} activeOpacity={0.9}>
        <Artwork uri={uri} size={size} radius={size / 2} />
        <Text style={styles.nameCenter} numberOfLines={1}>
          {title}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={[styles.card, { width: size }]} onPress={onPress} activeOpacity={0.9}>
      <Artwork uri={uri} size={size} radius={radius} />
      <LinearGradient
        colors={['transparent', 'rgba(2,2,6,0.92)']}
        style={[StyleSheet.absoluteFill, styles.scrim]}
      >
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  scrim: {
    justifyContent: 'flex-end',
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  title: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowRadius: 6,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: FontSize.xs,
    marginTop: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
  },
  nameCenter: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
