import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';

let RealBlurView: React.ComponentType<any>;
try {
  RealBlurView = require('expo-blur').BlurView;
} catch {
  RealBlurView = View as any;
}

interface SafeBlurViewProps extends ViewProps {
  intensity?: number;
  tint?: string;
  blurMethod?: string;
  blurTarget?: React.RefObject<any>;
  children?: React.ReactNode;
}

export function SafeBlurView({ intensity, tint, blurMethod, blurTarget, style, children, ...rest }: SafeBlurViewProps) {
  return (
    <RealBlurView
      intensity={intensity}
      tint={tint}
      blurMethod={blurMethod}
      blurTarget={blurTarget}
      style={style}
      {...rest}
    >
      {children}
    </RealBlurView>
  );
}
