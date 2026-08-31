import { View, Text, StyleSheet } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, FontSize } from '@/theme';

export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.text}>{title}</Text>
        <Text style={styles.sub}>Coming soon</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  text: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  sub: {
    color: Colors.textTertiary,
    fontSize: FontSize.sm,
  },
});
