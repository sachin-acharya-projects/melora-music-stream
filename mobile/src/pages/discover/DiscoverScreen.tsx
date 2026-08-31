import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { BACKGROUNDS } from '@/config/backgrounds';
import { SCREENS, navigateTo, type ScreenTarget } from '@/config/nav';
import type { IconName } from '@/config/menu';
import type { RootStackParamList } from '@/navigation/types';
import { Colors, Spacing, FontSize, Radius } from '@/theme';

type Category = { title: string; icon: IconName; target: ScreenTarget };

const CATEGORIES: Category[] = [
  { title: 'Trending now', icon: 'fire', target: { type: 'stack', name: 'Browse', params: { title: 'Trending now', icon: 'fire', kind: 'songs', source: 'trending' } } },
  { title: 'New Releases', icon: 'new-box', target: SCREENS.releases },
  { title: 'Albums you might like', icon: 'album', target: { type: 'stack', name: 'Browse', params: { title: 'Albums you might like', icon: 'album', kind: 'albums', source: 'albumsFavorites' } } },
  { title: 'Artists you might like', icon: 'account-music', target: { type: 'stack', name: 'Browse', params: { title: 'Artists you might like', icon: 'account-music', kind: 'artists', source: 'artistsFeatured' } } },
  { title: 'Mood & genre', icon: 'radio', target: { type: 'stack', name: 'Browse', params: { title: 'Mood & genre', icon: 'radio', kind: 'playlists', source: 'moodPlaylists' } } },
  { title: 'Made for you', icon: 'star', target: SCREENS.recommendations },
  { title: 'Recently played', icon: 'history', target: SCREENS.history },
  { title: 'Your playlists', icon: 'playlist-music', target: SCREENS.library },
];

export function DiscoverScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Screen source={BACKGROUNDS.discover}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader title="Discover" icon="compass" subtitle="Jump into a category" />
        <View style={styles.grid}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.title}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => navigateTo(navigation, c.target)}
            >
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name={c.icon} size={26} color={Colors.primary} />
              </View>
              <Text style={styles.title}>{c.title}</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={Colors.textSecondary}
                style={styles.chevron}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  grid: { gap: Spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface2,
  },
  title: { flex: 1, color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  chevron: { marginLeft: 'auto' },
});
