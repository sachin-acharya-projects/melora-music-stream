import { MediaTile } from '@/components/ui/MediaTile';
import type { Artist } from '@/types';

export function ArtistCard({
  artist,
  onPress,
}: {
  artist: Artist;
  onPress: () => void;
}) {
  return (
    <MediaTile
      uri={artist.thumbnail}
      title={artist.name}
      subtitle={`${artist.song_count ?? 0} tracks`}
      size={120}
      circular
      onPress={onPress}
    />
  );
}
