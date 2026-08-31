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
import { getStreamUrl, getDownloadUrl, type StreamInfo } from '@/services/stream';
import { saveState, recordHistory } from '@/services/playerApi';
import { proxied } from '@/config';
import { toast } from '@/components/ui/Toast';

export type RepeatMode = 'none' | 'one' | 'all';

interface PlayerState {
  queue: Song[];
  currentIndex: number;
  currentSong: Song | null;
  isPlaying: boolean;
  pendingSongId: string | null;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  position: number;
  duration: number;
  unshuffledQueue: Song[] | null;
  playSong: (song: Song, queue?: Song[], startIndex?: number) => Promise<void>;
  setQueue: (songs: Song[], startIndex?: number) => Promise<void>;
  addToQueue: (song: Song) => void;
  playNext: (song: Song) => void;
  removeFromQueue: (index: number) => void;
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

let loadToken = 0;

async function loadTrack(song: Song): Promise<void> {
  usePlayerStore.setState({ pendingSongId: song.id });
  let stream: StreamInfo | null = null;
  let streamError: string | null = null;
  try {
    stream = await getStreamUrl(song.id);
  } catch (e) {
    streamError = e instanceof Error ? e.message : 'Stream unavailable';
  }

  if (!stream?.url) {
    if (streamError) {
      toast(streamError);
      usePlayerStore.setState({ pendingSongId: null, isPlaying: false });
      return;
    }
    stream = { url: getDownloadUrl(song.id), title: song.title, thumbnail: song.thumbnail };
  }

  const url = stream?.url;
  if (!url) {
    toast('Playback failed: no stream URL was returned by the backend.');
    usePlayerStore.setState({ pendingSongId: null, isPlaying: false });
    return;
  }

  loadAndPlay(url);
  usePlayerStore.setState({ isPlaying: true, pendingSongId: null });
  const token = ++loadToken;
  setTimeout(() => {
    if (token !== loadToken) return;
    const st = usePlayerStore.getState();
    if (st.isPlaying && st.currentSong?.id === song.id && !getPlayer().playing) {
      usePlayerStore.setState({ isPlaying: false, pendingSongId: null });
      toast('Playback failed to start — the audio backend returned no stream.');
    }
  }, 2000);
  setLockScreenActive(true, {
    title: song.title,
    artist: song.uploader ?? song.artist ?? '',
    albumTitle: '',
    artworkUrl: proxied(song.thumbnail) ?? '',
  });
  recordHistory(song);
  void saveState({
    last_song_id: song.id,
    current_queue: usePlayerStore.getState().queue,
    last_playlist_id: null,
    recent_songs: [song],
  });
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: -1,
  currentSong: null,
  isPlaying: false,
  pendingSongId: null,
  volume: 1,
  shuffle: false,
  repeat: 'none',
  position: 0,
  duration: 0,
  unshuffledQueue: null,

  playSong: async (song, queue, startIndex = 0) => {
    const q = queue && queue.length ? queue : [song];
    const idx = queue && queue.length ? Math.min(startIndex, q.length - 1) : 0;
    set({ queue: q, currentIndex: idx, currentSong: q[idx], position: 0 });
    await loadTrack(q[idx]);
  },

  setQueue: async (songs, startIndex = 0) => {
    set({ queue: songs, currentIndex: startIndex, currentSong: songs[startIndex], position: 0 });
    if (songs[startIndex]) await loadTrack(songs[startIndex]);
  },

  addToQueue: (song) => {
    const { queue, currentIndex, currentSong } = get();
    const next = [...queue, song];
    set({ queue: next });
    if (currentIndex === -1 || !currentSong) {
      set({ currentIndex: next.length - 1, currentSong: song, isPlaying: true, position: 0 });
      void loadTrack(song);
    }
  },

  playNext: (song) => {
    const { queue, currentIndex } = get();
    const at = currentIndex === -1 ? queue.length : currentIndex + 1;
    const next = [...queue.slice(0, at), song, ...queue.slice(at)];
    if (currentIndex === -1) {
      set({ queue: next, currentIndex: next.length - 1, currentSong: song, isPlaying: true, position: 0 });
      void loadTrack(song);
    } else {
      set({ queue: next });
    }
  },

  removeFromQueue: (index) => {
    const { queue, currentIndex } = get();
    if (index < 0 || index >= queue.length) return;
    const next = queue.filter((_, i) => i !== index);
    if (index === currentIndex) {
      getPlayer().pause();
      if (next.length === 0) {
        set({ queue: [], currentIndex: -1, currentSong: null, isPlaying: false, position: 0 });
      } else {
        const ni = Math.min(currentIndex, next.length - 1);
        set({ queue: next, currentIndex: ni, currentSong: next[ni], isPlaying: true, position: 0 });
        void loadTrack(next[ni]);
      }
    } else {
      set({ queue: next, currentIndex: index < currentIndex ? currentIndex - 1 : currentIndex });
    }
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
    set({ currentIndex: idx, currentSong: queue[idx], position: 0 });
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
    set({ currentIndex: idx, currentSong: queue[idx], position: 0 });
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
    const { shuffle, queue, currentIndex, currentSong, unshuffledQueue } = get();
    if (!shuffle) {
      const rest = queue.filter((_, i) => i !== currentIndex);
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      const newQueue = currentSong ? [currentSong, ...rest] : rest;
      set({ shuffle: true, queue: newQueue, currentIndex: 0, unshuffledQueue: queue });
    } else {
      const restored = unshuffledQueue ?? queue;
      const newIndex = currentSong
        ? restored.findIndex((s) => s.id === currentSong.id)
        : 0;
      set({
        shuffle: false,
        queue: restored,
        currentIndex: newIndex >= 0 ? newIndex : 0,
        unshuffledQueue: null,
      });
    }
  },

  cycleRepeat: () => {
    const order: RepeatMode[] = ['none', 'all', 'one'];
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
