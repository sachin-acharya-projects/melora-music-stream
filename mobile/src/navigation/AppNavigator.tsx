import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { usePlayerStore } from '@/store/playerStore';
import { PlayerBar } from '@/components/PlayerBar';
import { ExpandableMenu } from '@/components/ui/ExpandableMenu';
import { HomeScreen } from '@/pages/home/HomeScreen';
import { SearchScreen } from '@/pages/search/SearchScreen';
import { LibraryScreen } from '@/pages/library/LibraryScreen';
import { RadioScreen } from '@/pages/radio/RadioScreen';
import { ProfileScreen } from '@/pages/profile/ProfileScreen';
import { PlaylistDetailScreen } from '@/pages/playlists/PlaylistDetailScreen';
import { ArtistDetailScreen } from '@/pages/artists/ArtistDetailScreen';
import { AlbumDetailScreen } from '@/pages/albums/AlbumDetailScreen';
import { RecommendationsScreen } from '@/pages/recommendations/RecommendationsScreen';
import { ReleasesScreen } from '@/pages/releases/ReleasesScreen';
import { DiscoverScreen } from '@/pages/discover/DiscoverScreen';
import { HistoryScreen } from '@/pages/history/HistoryScreen';
import { StatsScreen } from '@/pages/stats/StatsScreen';
import { SettingsScreen } from '@/pages/settings/SettingsScreen';
import { NotificationsScreen } from '@/pages/notifications/NotificationsScreen';
import { QueueScreen } from '@/pages/queue/QueueScreen';
import type { RootStackParamList, TabParamList } from '@/navigation/types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function TabNavigator() {
  return (
    <View style={styles.tabRoot}>
      <Tab.Navigator
        screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}
        tabBar={() => null}
      >
        <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
        <Tab.Screen name="SearchTab" component={SearchScreen} options={{ title: 'Search' }} />
        <Tab.Screen name="LibraryTab" component={LibraryScreen} options={{ title: 'Library' }} />
        <Tab.Screen name="RadioTab" component={RadioScreen} options={{ title: 'Radio' }} />
        <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
      </Tab.Navigator>
      <ExpandableMenu />
    </View>
  );
}

export function AppNavigator() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <View style={styles.wrap}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="TabRoot" component={TabNavigator} />
        <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
        <Stack.Screen name="ArtistDetail" component={ArtistDetailScreen} />
        <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen} />
        <Stack.Screen name="Recommendations" component={RecommendationsScreen} />
        <Stack.Screen name="Releases" component={ReleasesScreen} />
        <Stack.Screen name="Discover" component={DiscoverScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Stats" component={StatsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Queue" component={QueueScreen} />
      </Stack.Navigator>
      {currentSong && <PlayerBar onPress={() => navigation.navigate('NowPlaying')} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#070709',
  },
  tabRoot: {
    flex: 1,
  },
});
