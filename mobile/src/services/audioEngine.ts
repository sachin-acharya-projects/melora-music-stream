import { createAudioPlayer, AudioPlayer, AudioMetadata } from 'expo-audio';
import { getTokens } from '@/lib/secureStorage';

let player: AudioPlayer | null = null;

export function getPlayer(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(null);
  }
  return player;
}

export function loadAndPlay(uri: string): void {
  const p = getPlayer();
  p.replace({ uri });
  p.play();
}

export function togglePlay(): void {
  const p = getPlayer();
  if (p.playing) p.pause();
  else p.play();
}

export function seekTo(seconds: number): void {
  void getPlayer().seekTo(seconds);
}

export function setVolume(volume: number): void {
  getPlayer().volume = volume;
}

export function setLockScreenActive(active: boolean, metadata?: AudioMetadata): void {
  try {
    getPlayer().setActiveForLockScreen(active, metadata);
  } catch {
    // lock screen controls may be unavailable on some platforms
  }
}

export function updateLockScreenMetadata(metadata: AudioMetadata): void {
  try {
    getPlayer().updateLockScreenMetadata(metadata);
  } catch {
    // ignore
  }
}
