import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import type { ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '@/theme';

interface AuroraBackgroundProps {
  /** Local bundled backdrop (e.g. require('@/assets/backgrounds/x.jpg')). */
  source?: ImageSource;
  /** Remote artwork (album/artist thumbnails) — kept for art/audio screens. */
  uri?: string;
  /** Blur applied to the photo before tinting. */
  blurRadius?: number;
  /** How strongly the brand aurora tint washes over the photo (0–1). */
  tintOpacity?: number;
}

export function AuroraBackground({ source, uri, blurRadius = 30, tintOpacity = 0.6 }: AuroraBackgroundProps) {
  const media = source ?? (uri ? { uri } : undefined);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {media ? (
        <Image
          source={media}
          style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}
          blurRadius={blurRadius}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : null}
      <LinearGradient
        colors={Gradients.aurora}
        style={[StyleSheet.absoluteFill, { opacity: tintOpacity }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <LinearGradient
        colors={Gradients.glow}
        style={[StyleSheet.absoluteFill, { opacity: 0.4 }]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.background, opacity: 0.4 }]} />
    </View>
  );
}
