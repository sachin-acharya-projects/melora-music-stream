import { FlatList } from 'react-native';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SongRow } from '@/components/SongRow';
import { Screen } from '@/components/ui/Screen';
import { usePlayerStore } from '@/store/playerStore';
import { proxied } from '@/config';

export function QueueScreen({ navigation }: { navigation: any }) {
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const setQueue = usePlayerStore((s) => s.setQueue);

  return (
    <Screen backgroundUri={proxied(currentSong?.thumbnail) || undefined}>
      <ScreenHeader title="Queue" onBack={navigation.goBack} />
      <FlatList
        data={queue}
        keyExtractor={(s) => s.id}
        renderItem={({ item, index }) => (
          <SongRow song={item} onMore={() => void setQueue(queue, index)} />
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <ScreenHeader title="Nothing queued" />
        }
      />
    </Screen>
  );
}
