import { http } from '@/services/http';

export interface StreamInfo {
  url: string;
  title?: string;
  thumbnail?: string;
}

export async function getStreamUrl(videoId: string): Promise<StreamInfo | null> {
  try {
    const { data } = await http.get<StreamInfo>(`/stream/${videoId}`);
    return data;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

function extractError(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data && typeof data === 'object' && typeof (data as { detail?: unknown }).detail === 'string') {
    return (data as { detail: string }).detail;
  }
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status) return `Stream request failed (HTTP ${status})`;
  return 'Stream unavailable';
}

export function getDownloadUrl(videoId: string): string {
  return `${http.defaults.baseURL}/download/${videoId}`;
}
