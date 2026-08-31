import { MediaTile } from '@/components/ui/MediaTile';
import type { Playlist } from '@/types';

export function PlaylistCard({
  playlist,
  onPress,
}: {
  playlist: Playlist;
  onPress: () => void;
}) {
  const count = playlist.song_count ?? playlist.songs?.length ?? 0;
  return (
    <MediaTile
      uri={playlist.thumbnail}
      title={playlist.name}
      subtitle={`${count} ${count === 1 ? 'track' : 'tracks'}`}
      size={150}
      onPress={onPress}
    />
  );
}
