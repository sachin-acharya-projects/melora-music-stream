import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Artwork } from '@/components/ui/Artwork';
import { Colors, Spacing, Radius, FontSize } from '@/theme';
import { useAuthStore } from '@/store/authStore';
import { notificationsApi } from '@/services/api';
import { proxied } from '@/config';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const unread = useQuery({
    queryKey: ['unread'],
    queryFn: () => notificationsApi.unreadCount(),
  });

  const links: { label: string; icon: any; onPress: () => void; badge?: number }[] = [
    { label: 'Notifications', icon: 'bell', onPress: () => navigation.navigate('Notifications'), badge: unread.data?.unread_count ?? 0 },
    { label: 'Listening history', icon: 'history', onPress: () => navigation.navigate('History') },
    { label: 'Your stats', icon: 'chart-bar', onPress: () => navigation.navigate('Stats') },
    { label: 'Discover', icon: 'compass', onPress: () => navigation.navigate('Discover') },
    { label: 'Settings', icon: 'cog', onPress: () => navigation.navigate('Settings') },
  ];

  return (
    <Screen backgroundUri={proxied(user?.avatar) || undefined}>
      <View style={styles.header}>
        <Artwork uri={user?.avatar} size={96} radius={48} />
        <Text style={styles.name}>{user?.display_name ?? user?.username ?? 'Listener'}</Text>
        {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
      </View>

      <View style={styles.links}>
        {links.map((l) => (
          <TouchableOpacity key={l.label} style={styles.link} onPress={l.onPress}>
            <MaterialCommunityIcons name={l.icon} size={22} color={Colors.primary} />
            <Text style={styles.linkText}>{l.label}</Text>
            {l.badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{l.badge}</Text>
              </View>
            ) : (
              <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textTertiary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logout} onPress={() => void logout()}>
        <MaterialCommunityIcons name="logout" size={20} color={Colors.text} />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  name: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '800',
  },
  email: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  links: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  linkText: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: Colors.background,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface2,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
  },
  logoutText: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: FontSize.md,
  },
});
