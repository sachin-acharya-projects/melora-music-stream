import { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Spacing } from '@/theme';

export function HorizontalRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
});
