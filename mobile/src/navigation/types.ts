import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';

/** Params for the generic, filterable category browse screen. */
export type BrowseKind = 'songs' | 'albums' | 'playlists' | 'artists';
export type BrowseSource =
  | 'trending'
  | 'releases'
  | 'albumsFavorites'
  | 'artistsFeatured'
  | 'moodPlaylists';
export interface BrowseParams {
  title: string;
  icon: string;
  kind: BrowseKind;
  source: BrowseSource;
}

export type RootStackParamList = {
  Tabs: undefined;
  Intro: undefined;
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
  Browse: BrowseParams;
};

export type TabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  LibraryTab: undefined;
  RadioTab: undefined;
  ProfileTab: undefined;
};

export type AppNavigation = NativeStackNavigationProp<RootStackParamList>;
