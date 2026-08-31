import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, type NavigationProp, useNavigationState } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeBlurView } from '@/components/ui/SafeBlurView';
import { LinearGradient } from 'expo-linear-gradient';
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
import { BrowseScreen } from '@/pages/browse/BrowseScreen';
import { DiscoverScreen } from '@/pages/discover/DiscoverScreen';
import { HistoryScreen } from '@/pages/history/HistoryScreen';
import { StatsScreen } from '@/pages/stats/StatsScreen';
import { SettingsScreen } from '@/pages/settings/SettingsScreen';
import { NotificationsScreen } from '@/pages/notifications/NotificationsScreen';
import { QueueScreen } from '@/pages/queue/QueueScreen';
import { AppTabBar } from '@/components/AppTabBar';
import { Artwork } from '@/components/ui/Artwork';
import { BlurTargetProvider } from '@/components/ui/BlurTargetProvider';
import { usePlayerStore } from '@/store/playerStore';
import { getPlayer } from '@/services/audioEngine';
import { useAudioPlayerStatus } from 'expo-audio';
import { Colors, Gradients, Radius, Spacing } from '@/theme';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function TabNavigator() {
  return (
    <View style={styles.tabRoot}>
      <Tab.Navigator
        screenOptions={() => ({
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
          },
        })}
        tabBar={(props) => <AppTabBar {...props} />}
      >
        <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
        <Tab.Screen name="SearchTab" component={SearchScreen} options={{ title: 'Search' }} />
        <Tab.Screen name="LibraryTab" component={LibraryScreen} options={{ title: 'Library' }} />
        <Tab.Screen name="RadioTab" component={RadioScreen} options={{ title: 'Radio' }} />
        <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
      </Tab.Navigator>
    </View>
  );
}

function FloatingBall({ onPress }: { onPress: () => void }) {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const toggle = usePlayerStore((s) => s.toggle);
  const status = useAudioPlayerStatus(getPlayer());
  const insets = useSafeAreaInsets();
  const playing = currentSong ? !!status.playing : false;

  if (!currentSong) return null;

  return (
    <View style={[styles.ballWrap, { bottom: insets.bottom + Spacing.md }]} pointerEvents="box-none">
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.ball}>
        <SafeBlurView intensity={28} tint="dark" blurMethod="dimezisBlurViewSdk31Plus" style={StyleSheet.absoluteFill} />
        <View style={styles.ballInner}>
          <Artwork uri={currentSong.thumbnail} size={46} radius={23} />
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={(e) => { e.stopPropagation(); toggle(); }} style={styles.ballPlay} activeOpacity={0.8}>
        <LinearGradient colors={Gradients.brand} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
        <MaterialCommunityIcons name={playing ? 'pause' : 'play'} size={16} color={Colors.background} />
      </TouchableOpacity>
    </View>
  );
}

export function AppNavigator() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const activeTab = useNavigationState((state) => {
    const tabRoute = state.routes.find((r) => r.name === 'TabRoot');
    if (!tabRoute?.state) return 'HomeTab';
    return tabRoute.state.routes[tabRoute.state.index ?? 0]?.name ?? 'HomeTab';
  });

  const isHome = activeTab === 'HomeTab';

  return (
      <View style={styles.wrap}>
        <BlurTargetProvider>
          <View style={{ flex: 1 }}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="TabRoot" component={TabNavigator} />
              <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
              <Stack.Screen name="ArtistDetail" component={ArtistDetailScreen} />
              <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen} />
              <Stack.Screen name="Recommendations" component={RecommendationsScreen} />
              <Stack.Screen name="Releases" component={ReleasesScreen} />
              <Stack.Screen name="Browse" component={BrowseScreen} />
              <Stack.Screen name="Discover" component={DiscoverScreen} />
              <Stack.Screen name="History" component={HistoryScreen} />
              <Stack.Screen name="Stats" component={StatsScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="Queue" component={QueueScreen} />
            </Stack.Navigator>
          </View>
        </BlurTargetProvider>
        {currentSong && !isHome && (
          <FloatingBall onPress={() => navigation.navigate('NowPlaying')} />
        )}
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
  ballWrap: {
    position: 'absolute',
    right: Spacing.lg,
    zIndex: 20,
  },
  ball: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    backgroundColor: Colors.glassStrong,
    borderWidth: 1.5,
    borderColor: Colors.glassBorder,
  },
  ballInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballPlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.glassBorder,
  },
});
