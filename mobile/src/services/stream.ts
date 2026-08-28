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
  } catch {
    return null;
  }
}

export function getDownloadUrl(videoId: string): string {
  return `${http.defaults.baseURL}/download/${videoId}`;
}
