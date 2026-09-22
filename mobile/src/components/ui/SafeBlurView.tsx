import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';

interface SafeBlurViewProps extends ViewProps {
  intensity?: number;
  tint?: string;
  blurMethod?: 'dark' | 'light' | 'xlight';
  blurTarget?: any;
  children?: React.ReactNode;
}

export function SafeBlurView({ intensity = 10, tint = 'dark', blurMethod = 'dark', blurTarget, style, children, ...rest }: SafeBlurViewProps) {
  const overlayColor = tint === 'dark'
    ? 'rgba(10,10,14,0.7)'
    : tint === 'light'
      ? 'rgba(255,255,255,0.65)'
      : 'rgba(245,246,248,0.5)';
  const opacity = (intensity ?? 10) / 100;

  return (
    <View
      style={[
        style,
        {
          backgroundColor: overlayColor,
          opacity,
          ...rest,
        },
      ]}
    >
      {children}
    </View>
  );
}