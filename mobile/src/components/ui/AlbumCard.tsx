import { MediaTile } from '@/components/ui/MediaTile';
import type { Album } from '@/types';

export function AlbumCard({
  album,
  onPress,
}: {
  album: Album;
  onPress: () => void;
}) {
  return (
    <MediaTile
      uri={album.thumbnail}
      title={album.title}
      subtitle={album.artist ?? album.artist_name ?? ''}
      size={150}
      onPress={onPress}
    />
  );
}
