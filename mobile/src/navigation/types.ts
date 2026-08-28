import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Tabs: undefined;
  Login: undefined;
  NowPlaying: undefined;
  TabRoot: NavigatorScreenParams<TabParamList>;
  HomeTab: undefined;
  SearchTab: undefined;
  LibraryTab: undefined;
  RadioTab: undefined;
  ProfileTab: undefined;
  PlaylistDetail: { id: string };
  ArtistDetail: { slug: string };
  AlbumDetail: { browseId: string };
  Queue: undefined;
  Notifications: undefined;
  Settings: undefined;
  Stats: undefined;
  Discover: undefined;
  Releases: undefined;
  Recommendations: undefined;
  History: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  LibraryTab: undefined;
  RadioTab: undefined;
  ProfileTab: undefined;
};

export type AppNavigation = NativeStackNavigationProp<RootStackParamList>;
