import Constants from 'expo-constants';

type Extra = { apiUrl?: string };

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const API_URL =
  extra.apiUrl ?? 'https://melora.sachinacharya.name.np/api/v1';

export const WEB_BASE = API_URL.replace(/\/api\/v1$/, '');

export const OAUTH_SCHEME = 'com.melora.app';

export function proxied(url?: string | null): string | undefined {
  if (!url) return undefined;
  return `${API_URL}/thumbnail?url=${encodeURIComponent(url)}`;
}
