import * as SecureStore from 'expo-secure-store';

const ACCESS = 'melora_access_token';
const REFRESH = 'melora_refresh_token';

export async function getTokens(): Promise<{
  access: string | null;
  refresh: string | null;
}> {
  const [access, refresh] = await Promise.all([
    SecureStore.getItemAsync(ACCESS),
    SecureStore.getItemAsync(REFRESH),
  ]);
  return { access, refresh };
}

export async function setTokens(
  access: string,
  refresh: string
): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS, access),
    SecureStore.setItemAsync(REFRESH, refresh),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS),
    SecureStore.deleteItemAsync(REFRESH),
  ]);
}