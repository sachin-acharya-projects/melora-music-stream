import { FlatList } from 'react-native';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SongRow } from '@/components/SongRow';
import { Screen } from '@/components/ui/Screen';
import { BACKGROUNDS } from '@/config/backgrounds';
import { usePlayerStore } from '@/store/playerStore';

export function QueueScreen({ navigation }: { navigation: any }) {
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);

  return (
    <Screen source={BACKGROUNDS.queue}>
      <ScreenHeader title="Queue" onBack={navigation.goBack} />
      <FlatList
        data={queue}
        keyExtractor={(s) => s.id}
        renderItem={({ item, index }) => (
          <SongRow
            song={item}
            removable="queue"
            onRemove={() => removeFromQueue(index)}
          />
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <ScreenHeader title="Nothing queued" />
        }
      />
    </Screen>
  );
}
