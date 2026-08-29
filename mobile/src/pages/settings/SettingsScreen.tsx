import { View, Text, Switch, ScrollView, StyleSheet } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { BACKGROUNDS } from '@/config/backgrounds';
import { Colors, Spacing, FontSize } from '@/theme';
import { notificationsApi } from '@/services/api';

export function SettingsScreen({ navigation }: { navigation: any }) {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ['notifSettings'],
    queryFn: notificationsApi.settings,
  });

  const toggle = (key: string, val: boolean) => {
    const next = { ...(settings ?? {}), [key]: val };
    void notificationsApi.updateSettings(next).then(() =>
      qc.setQueryData(['notifSettings'], next)
    );
  };

  const entries = Object.entries(settings ?? {});

  return (
    <Screen source={BACKGROUNDS.settings}>
      <ScreenHeader title="Settings" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Notifications</Text>
        {entries.length === 0 ? (
          <Text style={styles.empty}>No notification settings available.</Text>
        ) : (
          entries.map(([key, val]) => (
            <View key={key} style={styles.row}>
              <Text style={styles.rowLabel}>{key.replace(/_/g, ' ')}</Text>
              <Switch
                value={val}
                onValueChange={(v) => toggle(key, v)}
                thumbColor={val ? Colors.primary : Colors.textTertiary}
                trackColor={{ false: Colors.surface2, true: Colors.primary + '55' }}
              />
            </View>
          ))
        )}

        <Text style={styles.section}>Appearance</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Dark theme</Text>
          <Text style={styles.value}>On</Text>
        </View>

        <Text style={styles.section}>About</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Version</Text>
          <Text style={styles.value}>1.0.0</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: Spacing.xxl },
  section: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  rowLabel: {
    color: Colors.text,
    fontSize: FontSize.md,
    textTransform: 'capitalize',
  },
  value: {
    color: Colors.textTertiary,
    fontSize: FontSize.sm,
  },
  empty: {
    color: Colors.textTertiary,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSize.sm,
  },
});
