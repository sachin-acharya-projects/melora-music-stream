import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { proxied } from '@/config';
import { Colors, Radius } from '@/theme';

interface ArtworkProps {
  uri?: string;
  size: number;
  radius?: number;
  style?: object;
}

export function Artwork({ uri, size, radius = Radius.md, style }: ArtworkProps) {
  const src = uri ? { uri: proxied(uri) } : undefined;
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: radius }, style]}>
      {src ? (
        <Image source={src} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <View style={[styles.placeholder, { borderRadius: radius }]}>
          <MaterialCommunityIcons name="music" size={size * 0.34} color={Colors.textTertiary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface2,
  },
});
