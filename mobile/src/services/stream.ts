import { http } from '@/services/http';

export interface StreamInfo {
  url: string;
  title?: string;
  thumbnail?: string;
}

const STREAM_RETRIES = 2;
const STREAM_RETRY_DELAY = 500;

export async function getStreamUrl(videoId: string): Promise<StreamInfo | null> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= STREAM_RETRIES; attempt++) {
    try {
      const { data } = await http.get<StreamInfo>(`/stream/${videoId}`);
      return data;
    } catch (err) {
      lastErr = err;
      if (attempt < STREAM_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, STREAM_RETRY_DELAY));
      }
    }
  }
  throw new Error(cleanMessage(lastErr));
}

function rawDetail(err: unknown): string | null {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data && typeof data === 'object' && typeof (data as { detail?: unknown }).detail === 'string') {
    return (data as { detail: string }).detail;
  }
  return null;
}

function cleanMessage(err: unknown): string {
  const detail = rawDetail(err);
  if (detail) {
    console.error('[stream] backend error:', detail);
    if (/sign in to confirm you'?re not a bot|yt-dlp|youtube/i.test(detail)) {
      return 'This track is temporarily unavailable. Please try again later.';
    }
    return 'Playback failed. Please try again.';
  }
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status) return 'Playback failed (server error). Please try again.';
  return 'Playback failed. Please try again.';
}

export function getDownloadUrl(videoId: string): string {
  return `${http.defaults.baseURL}/download/${videoId}`;
}
