import { Fragment, type ReactNode } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  recommendationsApi,
  historyApi,
  playlistsApi,
  artistsApi,
  albumsApi,
  discoverApi,
} from '@/services/api';
import { SongRow } from '@/components/SongRow';
import { PlaylistCard } from '@/components/ui/PlaylistCard';
import { ArtistCard } from '@/components/ui/ArtistCard';
import { AlbumCard } from '@/components/ui/AlbumCard';
import { HorizontalRow } from '@/components/ui/HorizontalRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, FontSize } from '@/theme';
import { proxied } from '@/config';
import type { RootStackParamList } from '@/navigation/types';
import { queryKeys } from '@/config/domains';
import { navigateTo } from '@/config/nav';
import { HOME_SECTIONS, HOME_LIMITS, type HomeSectionMeta } from '@/pages/home/config';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();

  const recs = useQuery({
    queryKey: queryKeys.home.recommendations,
    queryFn: () => recommendationsApi.list(HOME_LIMITS.recommendations),
  });
  const recent = useQuery({
    queryKey: queryKeys.home.recentlyPlayed,
    queryFn: () => historyApi.recentlyPlayed({ limit: HOME_LIMITS.recent }),
  });
  const playlists = useQuery({
    queryKey: queryKeys.home.playlistsFollowing,
    queryFn: () => playlistsApi.following(),
  });
  const artists = useQuery({
    queryKey: queryKeys.home.artistsFeatured,
    queryFn: () => artistsApi.featured(),
  });
  const albums = useQuery({
    queryKey: queryKeys.home.albumsFavorites,
    queryFn: () => albumsApi.favorites(),
  });
  const feed = useQuery({
    queryKey: queryKeys.home.discoverFeed,
    queryFn: () => discoverApi.feed(),
  });

  const backgroundUri = proxied(
    recs.data?.[0]?.thumbnail ?? feed.data?.trending?.[0]?.thumbnail,
  );

  const refetchAll = () => {
    recs.refetch();
    recent.refetch();
    playlists.refetch();
    artists.refetch();
    albums.refetch();
    feed.refetch();
  };

  const loading = recs.isLoading && !recs.data && !playlists.data && !albums.data;

  const blocks: { key: string; node: ReactNode }[] = [];

  blocks.push({
    key: 'greeting',
    node: (
      <View style={styles.greeting}>
        <Text style={styles.hello}>Good to see you</Text>
        <Text style={styles.sub}>Pick up where you left off</Text>
      </View>
    ),
  });

  if (loading) {
    blocks.push({
      key: 'loader',
      node: <ActivityIndicator style={styles.loader} color={Colors.primary} />,
    });
  }

  if (recs.data && recs.data.length > 0) {
    blocks.push({
      key: 'recs',
      node: (
        <Section meta={HOME_SECTIONS.recs}>
          {recs.data.slice(0, HOME_LIMITS.sectionItems).map((s) => (
            <SongRow key={s.id} song={s} />
          ))}
        </Section>
      ),
    });
  }

  if (recent.data && recent.data.length > 0) {
    blocks.push({
      key: 'recent',
      node: (
        <Section meta={HOME_SECTIONS.recent}>
          {recent.data.slice(0, HOME_LIMITS.sectionItems).map((s) => (
            <SongRow key={s.id} song={s} />
          ))}
        </Section>
      ),
    });
  }

  if (playlists.data && playlists.data.length > 0) {
    blocks.push({
      key: 'playlists',
      node: (
        <Section meta={HOME_SECTIONS.playlists}>
          <HorizontalRow>
            {playlists.data.map((p) => (
              <PlaylistCard
                key={p.id}
                playlist={p}
                onPress={() => navigation.navigate('PlaylistDetail', { id: p.id })}
              />
            ))}
          </HorizontalRow>
        </Section>
      ),
    });
  }

  if (albums.data && albums.data.length > 0) {
    blocks.push({
      key: 'albums',
      node: (
        <Section meta={HOME_SECTIONS.albums}>
          <HorizontalRow>
            {albums.data.map((a) => (
              <AlbumCard
                key={a.browse_id}
                album={a}
                onPress={() => navigation.navigate('AlbumDetail', { browseId: a.browse_id })}
              />
            ))}
          </HorizontalRow>
        </Section>
      ),
    });
  }

  if (artists.data && artists.data.length > 0) {
    blocks.push({
      key: 'artists',
      node: (
        <Section meta={HOME_SECTIONS.artists}>
          <HorizontalRow>
            {artists.data.map((ar) => (
              <ArtistCard
                key={ar.id}
                artist={ar}
                onPress={() => navigation.navigate('ArtistDetail', { slug: ar.slug })}
              />
            ))}
          </HorizontalRow>
        </Section>
      ),
    });
  }

  if (feed.data?.mood_playlists && feed.data.mood_playlists.length > 0) {
    blocks.push({
      key: 'mood',
      node: (
        <Section meta={HOME_SECTIONS.mood}>
          <HorizontalRow>
            {feed.data.mood_playlists.map((p) => (
              <PlaylistCard
                key={p.id}
                playlist={p}
                onPress={() => navigation.navigate('PlaylistDetail', { id: p.id })}
              />
            ))}
          </HorizontalRow>
        </Section>
      ),
    });
  }

  return (
    <Screen backgroundUri={backgroundUri || undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={recs.isFetching || recent.isFetching}
            onRefresh={refetchAll}
            tintColor={Colors.primary}
          />
        }
      >
        {blocks.map((b) => (
          <Fragment key={b.key}>{b.node}</Fragment>
        ))}
      </ScrollView>
    </Screen>
  );
}

function Section({ meta, children }: { meta: HomeSectionMeta; children: ReactNode }) {
  const navigation = useNavigation<Nav>();
  return (
    <View style={styles.section}>
      <SectionHeader
        title={meta.title}
        icon={meta.icon}
        onPress={() => navigateTo(navigation, meta.seeAll)}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing.xxl,
  },
  greeting: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  hello: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '800',
  },
  sub: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  loader: {
    marginTop: Spacing.xl,
  },
  section: {
    marginTop: Spacing.lg,
  },
});
