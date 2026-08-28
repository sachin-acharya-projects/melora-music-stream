import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { OAUTH_SCHEME, WEB_BASE, API_URL } from '@/config';
import { getTokens, setTokens, clearTokens } from '@/lib/secureStorage';
import { http } from '@/services/http';
import type { User } from '@/types';

WebBrowser.maybeCompleteAuthSession();

export async function loginWithGoogle(): Promise<boolean> {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: OAUTH_SCHEME,
    path: 'auth/callback',
  });
  const authUrl = `${WEB_BASE}/api/v1/auth/login?redirect=${encodeURIComponent(
    redirectUri
  )}`;
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
  if (result.type === 'success' && result.url) {
    const params = new URL(result.url).searchParams;
    const access = params.get('access_token');
    const refresh = params.get('refresh_token');
    if (access && refresh) {
      await setTokens(access, refresh);
      return true;
    }
  }
  return false;
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await http.get<User>('/auth/me');
  return data;
}

export async function logout(): Promise<void> {
  try {
    await http.post('/auth/logout');
  } catch {
    // ignore network errors on logout
  }
  await clearTokens();
}
