import { Glass } from '@/components/ui/Glass';
import { SongRow } from '@/components/SongRow';
import { AlbumCard } from '@/components/ui/AlbumCard';
import { ArtistCard } from '@/components/ui/ArtistCard';
import { HorizontalRow } from '@/components/ui/HorizontalRow';
import { PlaylistCard } from '@/components/ui/PlaylistCard';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { BACKGROUNDS } from '@/config/backgrounds';
import { proxied } from '@/config';
import { queryKeys } from '@/config/domains';
import { navigateTo } from '@/config/nav';
import type { RootStackParamList } from '@/navigation/types';
import { HOME_LIMITS, HOME_SECTION_ORDER, HOME_SECTIONS, type HomeSectionKey, type HomeSectionMeta } from '@/pages/home/config';
import {
    albumsApi,
    artistsApi,
    discoverApi,
    historyApi,
    playlistsApi,
    recommendationsApi,
    releasesApi,
} from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { usePlayerStore } from '@/store/playerStore';
import { Colors, FontSize, Gradients, Radius, Spacing } from '@/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Fragment, type ReactNode, useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const HERO_HEIGHT = 340;
const PULL_THRESHOLD = 80;

export function HomeScreen() {
    const navigation = useNavigation<Nav>();
    const user = useAuthStore((s) => s.user);
    const currentSong = usePlayerStore((s) => s.currentSong);
    const insets = useSafeAreaInsets();
    const scrollY = useRef(new Animated.Value(0)).current;
    const [refreshing, setRefreshing] = useState(false);

    const recs = useQuery({
        queryKey: queryKeys.home.recommendations,
        queryFn: () => recommendationsApi.list(HOME_LIMITS.recommendations),
    });
    const recent = useQuery({
        queryKey: queryKeys.home.recentlyPlayed,
        queryFn: () => historyApi.recentlyPlayed({ limit: HOME_LIMITS.recent }),
    });
    const playlists = useQuery({
        queryKey: queryKeys.home.playlistsOwned,
        queryFn: () => playlistsApi.list(),
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
    const newReleasesSongs = useQuery({
        queryKey: queryKeys.releases.list,
        queryFn: () => releasesApi.list({ limit: HOME_LIMITS.sectionItems }),
    });

    const refetchAll = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            recs.refetch(),
            recent.refetch(),
            playlists.refetch(),
            artists.refetch(),
            albums.refetch(),
            feed.refetch(),
            newReleasesSongs.refetch(),
        ]);
        setRefreshing(false);
    }, [recs, recent, playlists, artists, albums, feed, newReleasesSongs]);

    const loading = recs.isLoading && !recs.data && !playlists.data && !albums.data;

    const paddingBottom = currentSong ? 230 : 110;

    const heroTranslateY = scrollY.interpolate({
        inputRange: [-100, 0, HERO_HEIGHT * 2],
        outputRange: [30, 0, HERO_HEIGHT * 0.3],
        extrapolate: 'clamp',
    });

    const heroOpacity = scrollY.interpolate({
        inputRange: [0, HERO_HEIGHT * 2],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const greetingOpacity = scrollY.interpolate({
        inputRange: [0, 140],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const greetingTranslateY = scrollY.interpolate({
        inputRange: [0, 140],
        outputRange: [0, -40],
        extrapolate: 'clamp',
    });

    const dropScale = scrollY.interpolate({
        inputRange: [-PULL_THRESHOLD * 1.5, -PULL_THRESHOLD, 0],
        outputRange: [1.4, 1, 0],
        extrapolate: 'clamp',
    });

    const dropOpacity = scrollY.interpolate({
        inputRange: [-PULL_THRESHOLD * 1.2, -PULL_THRESHOLD * 0.5, 0],
        outputRange: [1, 0.6, 0],
        extrapolate: 'clamp',
    });

    const dropBounce = scrollY.interpolate({
        inputRange: [-PULL_THRESHOLD * 2, -PULL_THRESHOLD, 0],
        outputRange: [0, 1, 0],
        extrapolate: 'clamp',
    });

    const sectionNode = (key: HomeSectionKey): ReactNode | null => {
        switch (key) {
            case 'recent':
                return recent.data?.length ? (
                    <Section meta={HOME_SECTIONS.recent}>
                        <Glass style={{ marginHorizontal: Spacing.lg, paddingTop: Spacing.sm + 10, paddingBottom: Spacing.xs }}>
                            {recent.data.slice(0, HOME_LIMITS.sectionItems).map((s, idx, arr) => (
                                <SongRow key={s.id} song={s} grouped={true} isDownloaded={idx === 1} inList isLast={idx === arr.length - 1} />
                            ))}
                        </Glass>
                    </Section>
                ) : null;
            case 'recs':
                return recs.data?.length ? (
                    <Section meta={HOME_SECTIONS.recs}>
                        <Glass style={{ marginHorizontal: Spacing.lg, paddingTop: Spacing.sm + 10, paddingBottom: Spacing.xs }}>
                            {recs.data.slice(0, HOME_LIMITS.sectionItems).map((s, idx, arr) => (
                                <SongRow key={s.id} song={s} grouped={true} isDownloaded={idx === 1} inList isLast={idx === arr.length - 1} />
                            ))}
                        </Glass>
                    </Section>
                ) : null;
            case 'trending':
                return feed.data?.top_songs?.length ? (
                    <Section meta={HOME_SECTIONS.trending}>
                        <Glass style={{ marginHorizontal: Spacing.lg, paddingTop: Spacing.sm + 10, paddingBottom: Spacing.xs }}>
                            {feed.data.top_songs.slice(0, HOME_LIMITS.sectionItems).map((s, idx, arr) => (
                                <SongRow key={s.id} song={s} grouped={true} isDownloaded={idx === 1} inList isLast={idx === arr.length - 1} />
                            ))}
                        </Glass>
                    </Section>
                ) : null;
            case 'newReleases':
                return newReleasesSongs.data?.length ? (
                    <Section meta={HOME_SECTIONS.newReleases}>
                        <Glass style={{ marginHorizontal: Spacing.lg, paddingTop: Spacing.sm + 10, paddingBottom: Spacing.xs }}>
                            {newReleasesSongs.data.slice(0, HOME_LIMITS.sectionItems).map((s, idx, arr) => (
                                <SongRow key={s.id} song={s} grouped={true} isDownloaded={idx === 1} inList isLast={idx === arr.length - 1} />
                            ))}
                        </Glass>
                    </Section>
                ) : null;
            case 'playlists':
                return playlists.data?.length ? (
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
                ) : null;
            case 'albums':
                return albums.data?.length ? (
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
                ) : null;
            case 'artists':
                return artists.data?.length ? (
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
                ) : null;
            case 'mood':
                return feed.data?.mood_playlists?.length ? (
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
                ) : null;
        }
    };

    const blocks: { key: string; node: ReactNode }[] = [];
    if (loading) {
        blocks.push({ key: 'loader', node: <ActivityIndicator style={styles.loader} color={Colors.primary} /> });
    }
    for (const key of HOME_SECTION_ORDER) {
        const node = sectionNode(key);
        if (node) blocks.push({ key, node });
    }

    return (
        <Screen noBackground>
            <Animated.View
                style={[styles.heroWrap, { transform: [{ translateY: heroTranslateY }], opacity: heroOpacity }]}
                pointerEvents="none"
            >
                <Image
                    source={BACKGROUNDS.hero}
                    style={styles.heroImage}
                    contentFit="cover"
                />
                <LinearGradient
                    colors={['transparent', 'transparent', 'rgba(7,7,9,0.4)', 'rgba(7,7,9,0.85)', Colors.background]}
                    locations={[0, 0.35, 0.65, 0.88, 1]}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>

            <Animated.View
                style={[styles.greetingWrap, { opacity: greetingOpacity, transform: [{ translateY: greetingTranslateY }] }]}
                pointerEvents="box-none"
            >
                <View style={[styles.headerRow, { paddingTop: Spacing.xxl }]}>
                    <View style={styles.greeting}>
                        <Text style={styles.helloWhite}>Good to</Text>
                        <Text style={styles.helloCyan}>see you</Text>
                        <Text style={styles.sub}>Pick up where you left off</Text>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('ProfileTab' as any)} activeOpacity={0.8} style={styles.avatarBtn}>
                        {user?.avatar ? (
                            <Image source={{ uri: proxied(user.avatar) }} style={styles.avatarImg} />
                        ) : (
                            <MaterialCommunityIcons name="account-outline" size={22} color={Colors.textSecondary} />
                        )}
                    </TouchableOpacity>
                </View>
            </Animated.View>

            <Animated.View style={[styles.dropWrap, { transform: [{ scale: dropScale }], opacity: dropOpacity }]} pointerEvents="none">
                <View style={styles.dropOuter}>
                    <Animated.View style={[styles.dropInner, { transform: [{ scaleY: Animated.add(1, Animated.multiply(dropBounce, 0.6)) }] }]} />
                    <View style={styles.dropStem} />
                </View>
            </Animated.View>

            {refreshing && (
                <View style={styles.refreshIndicator}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                </View>
            )}

            <Animated.ScrollView
                contentContainerStyle={[styles.content, { paddingBottom }]}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true },
                )}
                scrollEventThrottle={16}
            >
                <View key="hero-spacer" style={{ height: HERO_HEIGHT }} />
                {blocks.map((b) => (
                    <Fragment key={b.key}>{b.node}</Fragment>
                ))}
            </Animated.ScrollView>
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
        paddingBottom: 110,
    },
    heroWrap: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: HERO_HEIGHT + 100,
    },
    heroImage: {
        width: '100%',
        height: '100%',
        opacity: 1,
    },
    greetingWrap: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    greeting: {
        flex: 1,
    },
    helloWhite: {
        color: Colors.white,
        fontSize: FontSize.xxl,
        fontWeight: '800',
        lineHeight: 40,
    },
    helloCyan: {
        color: Colors.primary,
        fontSize: FontSize.xxl,
        fontWeight: '800',
        lineHeight: 40,
    },
    sub: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        marginTop: 6,
    },
    loader: {
        marginTop: Spacing.xl,
    },
    section: {
        marginTop: Spacing.lg,
    },
    avatarBtn: {
        width: 39,
        height: 39,
        borderRadius: 20,
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: {
        width: 39,
        height: 39,
        borderRadius: 20,
    },
    dropWrap: {
        position: 'absolute',
        top: HERO_HEIGHT / 2 - 24,
        alignSelf: 'center',
        zIndex: 3,
    },
    dropOuter: {
        alignItems: 'center',
    },
    dropInner: {
        width: 18,
        borderRadius: 9,
        backgroundColor: Colors.primary,
        opacity: 0.8,
    },
    dropStem: {
        width: 2,
        height: 10,
        backgroundColor: Colors.primary,
        opacity: 0.5,
        marginTop: -2,
        borderRadius: 1,
    },
    refreshIndicator: {
        position: 'absolute',
        top: HERO_HEIGHT / 2 - 14,
        alignSelf: 'center',
        zIndex: 4,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(10,10,14,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
