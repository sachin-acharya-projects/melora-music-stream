import { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Animated, Linking, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePlayerStore } from '@/store/playerStore';
import { playlistsApi } from '@/services/api';
import { getDownloadUrl } from '@/services/stream';
import { toast } from '@/components/ui/Toast';
import { Colors, Radius, Spacing, FontSize } from '@/theme';
import type { Song } from '@/types';

interface Props {
  song: Song | null;
  visible: boolean;
  onClose: () => void;
  removable?: 'playlist' | 'queue';
  onRemove?: (song: Song) => void;
}

export function SongActionSheet({ song, visible, onClose, removable, onRemove }: Props) {
  const playNext = usePlayerStore((s) => s.playNext);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const slide = useRef(new Animated.Value(0)).current;
  const [playlists, setPlaylists] = useState<{ id: string; name: string }[]>([]);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (visible) {
      setPicking(false);
      Animated.timing(slide, { toValue: 1, duration: 240, useNativeDriver: true }).start();
    }
  }, [visible, slide]);

  if (!song) return null;

  const requestClose = () => {
    Animated.timing(slide, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setPicking(false);
      onClose();
    });
  };

  const openPlaylistPicker = async () => {
    try {
      setPlaylists(await playlistsApi.options());
      setPicking(true);
    } catch {
      toast('Could not load playlists');
    }
  };

  const addToPlaylist = async (id: string, name: string) => {
    try {
      await playlistsApi.add(id, song);
      toast(`Added to ${name}`);
    } catch {
      toast('Failed to add to playlist');
    } finally {
      requestClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={requestClose}>
      <View style={styles.modal}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={requestClose} />
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [
                { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [560, 0] }) },
              ],
              opacity: slide,
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(52,224,161,0.10)', 'rgba(34,211,238,0.04)', 'transparent']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {song.title}
            </Text>
            {song.uploader || song.artist ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {song.uploader ?? song.artist}
              </Text>
            ) : null}
          </View>

          {picking ? (
            <View style={styles.list}>
              <ActionRow icon="chevron-left" label="Back" onPress={() => setPicking(false)} />
              {playlists.length === 0 ? (
                <Text style={styles.empty}>No playlists yet</Text>
              ) : (
                playlists.map((p) => (
                  <ActionRow
                    key={p.id}
                    icon="music"
                    label={p.name}
                    onPress={() => void addToPlaylist(p.id, p.name)}
                  />
                ))
              )}
            </View>
          ) : (
            <View style={styles.list}>
              <ActionRow icon="play-circle-outline" label="Play next" onPress={() => { playNext(song); requestClose(); }} />
              <ActionRow icon="playlist-plus" label="Add to queue" onPress={() => { addToQueue(song); toast('Added to queue'); requestClose(); }} />
              <ActionRow icon="plus-box" label="Add to playlist" onPress={openPlaylistPicker} />
              <ActionRow icon="download" label="Download" onPress={() => { void Linking.openURL(getDownloadUrl(song.id)); requestClose(); }} />
              {removable ? (
                <ActionRow
                  icon="trash-can"
                  label={removable === 'playlist' ? 'Remove from playlist' : 'Remove from queue'}
                  danger
                  onPress={() => { onRemove?.(song); requestClose(); }}
                />
              ) : null}
            </View>
          )}

          <TouchableOpacity style={styles.cancel} onPress={requestClose} activeOpacity={0.6}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
      <MaterialCommunityIcons
        name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={22}
        color={danger ? Colors.danger : Colors.textSecondary}
      />
      <Text style={[styles.rowText, danger && { color: Colors.danger }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: Colors.glassStrong,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.glassBorder,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -8 },
    elevation: 14,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    marginBottom: Spacing.sm,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  list: {
    paddingVertical: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  rowText: {
    color: Colors.text,
    fontSize: FontSize.md,
  },
  empty: {
    color: Colors.textTertiary,
    fontSize: FontSize.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  cancel: {
    marginTop: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
    fontWeight: '600',
  },
});
