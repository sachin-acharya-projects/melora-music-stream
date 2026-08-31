import { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuroraBackground } from '@/components/ui/AuroraBackground';
import type { ImageSource } from 'expo-image';
import { Colors } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  style?: ViewStyle;
  backgroundUri?: string;
  source?: ImageSource;
}

export function Screen({ children, style, backgroundUri, source }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
        style,
      ]}
    >
      <AuroraBackground source={source} uri={backgroundUri} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
});
