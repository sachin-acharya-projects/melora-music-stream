import { create } from 'zustand';
import type { Song } from '@/types';
import {
  getPlayer,
  loadAndPlay,
  togglePlay as engineToggle,
  seekTo as engineSeek,
  setVolume as engineSetVolume,
  setLockScreenActive,
  updateLockScreenMetadata,
} from '@/services/audioEngine';
import { getStreamUrl, getDownloadUrl } from '@/services/stream';
import { saveState, recordHistory } from '@/services/playerApi';
import { proxied } from '@/config';

export type RepeatMode = 'none' | 'one' | 'all';

interface PlayerState {
  queue: Song[];
  currentIndex: number;
  currentSong: Song | null;
  isPlaying: boolean;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  position: number;
  duration: number;
  playSong: (song: Song, queue?: Song[], startIndex?: number) => Promise<void>;
  setQueue: (songs: Song[], startIndex?: number) => Promise<void>;
  toggle: () => void;
  next: () => void;
  previous: (positionSec?: number) => void;
  seek: (sec: number) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  onFinished: () => void;
  syncStatus: (position: number, duration: number, playing: boolean) => void;
}

async function loadTrack(song: Song): Promise<void> {
  const state = usePlayerStore.getState();
  let stream = await getStreamUrl(song.id);
  if (!stream?.url) {
    stream = { url: getDownloadUrl(song.id), title: song.title, thumbnail: song.thumbnail };
  }
  const url = stream?.url;
  if (!url) return;
  loadAndPlay(url);
  usePlayerStore.setState({ currentSong: song, isPlaying: true });
  setLockScreenActive(true, {
    title: song.title,
    artist: song.uploader ?? song.artist ?? '',
    albumTitle: '',
    artworkUrl: proxied(song.thumbnail) ?? '',
  });
  recordHistory(song.id);
  void saveState({
    last_song_id: song.id,
    current_queue: state.queue,
    last_playlist_id: null,
    recent_songs: [song],
  });
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: -1,
  currentSong: null,
  isPlaying: false,
  volume: 1,
  shuffle: false,
  repeat: 'none',
  position: 0,
  duration: 0,

  playSong: async (song, queue, startIndex = 0) => {
    const q = queue && queue.length ? queue : [song];
    const idx = queue && queue.length ? Math.min(startIndex, q.length - 1) : 0;
    set({ queue: q, currentIndex: idx });
    await loadTrack(q[idx]);
  },

  setQueue: async (songs, startIndex = 0) => {
    set({ queue: songs, currentIndex: startIndex });
    if (songs[startIndex]) await loadTrack(songs[startIndex]);
  },

  toggle: () => {
    engineToggle();
    set({ isPlaying: getPlayer().playing });
  },

  next: () => {
    const { queue, currentIndex, repeat } = get();
    if (!queue.length) return;
    let idx = currentIndex + 1;
    if (idx >= queue.length) {
      if (repeat === 'all') idx = 0;
      else {
        getPlayer().pause();
        set({ isPlaying: false });
        return;
      }
    }
    set({ currentIndex: idx });
    void loadTrack(queue[idx]);
  },

  previous: (positionSec) => {
    const { queue, currentIndex } = get();
    if (!queue.length) return;
    if (positionSec && positionSec > 3) {
      engineSeek(0);
      set({ position: 0 });
      return;
    }
    let idx = currentIndex - 1;
    if (idx < 0) idx = queue.length - 1;
    set({ currentIndex: idx });
    void loadTrack(queue[idx]);
  },

  seek: (sec) => {
    engineSeek(sec);
    set({ position: sec });
  },

  setVolume: (v) => {
    engineSetVolume(v);
    set({ volume: v });
  },

  toggleShuffle: () => {
    const { shuffle, queue, currentIndex } = get();
    if (!shuffle) {
      const current = queue[currentIndex];
      const rest = queue.filter((_, i) => i !== currentIndex);
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      set({ shuffle: true, queue: [current, ...rest], currentIndex: 0 });
    } else {
      set({ shuffle: false });
    }
  },

  cycleRepeat: () => {
    const order: RepeatMode[] = ['none', 'one', 'all'];
    const i = order.indexOf(get().repeat);
    set({ repeat: order[(i + 1) % order.length] });
  },

  onFinished: () => {
    const { repeat } = get();
    if (repeat === 'one') {
      engineSeek(0);
      getPlayer().play();
      return;
    }
    get().next();
  },

  syncStatus: (position, duration, playing) => {
    set({ position, duration, isPlaying: playing });
  },
}));
