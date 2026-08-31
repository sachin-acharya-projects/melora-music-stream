import { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '@/theme';

interface BackgroundArtProps {
  uri?: string;
  children?: ReactNode;
  style?: ViewStyle;
  /** darkness of the scrim overlay (0..1). higher = more subtle image */
  intensity?: number;
  blur?: number;
}

export function BackgroundArt({
  uri,
  children,
  style,
  intensity = 0.74,
  blur = 90,
}: BackgroundArtProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          blurRadius={blur}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : null}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: Colors.background, opacity: intensity },
        ]}
      />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[StyleSheet.absoluteFill, styles.vignette]} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  vignette: {
    backgroundColor: 'transparent',
  },
});
