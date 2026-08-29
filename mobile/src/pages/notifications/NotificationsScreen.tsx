import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { BACKGROUNDS } from '@/config/backgrounds';
import { Colors, Spacing, Radius, FontSize } from '@/theme';
import { notificationsApi, type AppNotification } from '@/services/api';

export function NotificationsScreen({ navigation }: { navigation: any }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
  });

  const markAll = () => {
    void notificationsApi.markAllRead().then(() => qc.invalidateQueries({ queryKey: ['notifications'] }));
  };

  const open = (n: AppNotification) => {
    if (!n.read) {
      void notificationsApi.markRead(n.id).then(() => qc.invalidateQueries({ queryKey: ['notifications'] }));
    }
  };

  return (
    <Screen source={BACKGROUNDS.notifications}>
      <ScreenHeader
        title="Notifications"
        onBack={navigation.goBack}
        right={
          data && data.unread_count > 0 ? (
            <TouchableOpacity onPress={markAll}>
              <Text style={styles.markAll}>Mark all read</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={Colors.primary} />
      ) : (
        <FlatList
          data={data?.notifications ?? []}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.item, !item.read && styles.itemUnread]} onPress={() => open(item)}>
              <MaterialCommunityIcons
                name={item.read ? 'bell-outline' : 'bell'}
                size={22}
                color={item.read ? Colors.textTertiary : Colors.primary}
              />
              <View style={styles.textWrap}>
                <Text style={styles.title}>{item.title}</Text>
                {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>You're all caught up.</Text>}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  markAll: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
  loader: { marginTop: Spacing.xl },
  list: { paddingBottom: Spacing.xxl },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  itemUnread: { backgroundColor: Colors.primary + '12' },
  textWrap: { flex: 1 },
  title: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  body: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  empty: { color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.xl },
});
