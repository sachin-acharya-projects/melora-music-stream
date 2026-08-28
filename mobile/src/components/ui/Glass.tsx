import { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, Radius, Shadow } from '@/theme';

interface GlassProps {
  children?: ReactNode;
  style?: ViewStyle;
  radius?: number;
  intensity?: number;
  strong?: boolean;
  elevated?: boolean;
  padding?: number;
}

export function Glass({
  children,
  style,
  radius = Radius.lg,
  intensity = 26,
  strong = false,
  elevated = false,
  padding,
}: GlassProps) {
  return (
    <View
      style={[
        styles.wrap,
        { borderRadius: radius },
        elevated && styles.elevated,
        style,
      ]}
    >
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: strong ? Colors.glassStrong : Colors.glass,
            borderRadius: radius,
            borderWidth: 1,
            borderColor: Colors.glassBorder,
            borderTopColor: 'rgba(255,255,255,0.20)',
          },
        ]}
        pointerEvents="none"
      />
      <View style={[styles.content, padding != null && { padding }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  elevated: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
});
