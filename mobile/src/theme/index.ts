import { Platform } from 'react-native';

export const Colors = {
  background: '#070709',
  surface: 'rgba(255,255,255,0.05)',
  surface2: 'rgba(255,255,255,0.09)',
  glass: 'rgba(18,20,28,0.55)',
  glassStrong: 'rgba(14,16,22,0.72)',
  glassBorder: 'rgba(255,255,255,0.12)',
  text: '#F5F6F8',
  textSecondary: 'rgba(245,246,248,0.66)',
  textTertiary: 'rgba(245,246,248,0.40)',
  primary: '#34E0A1',
  primary2: '#22D3EE',
  primarySoft: 'rgba(52,224,161,0.16)',
  border: 'rgba(255,255,255,0.08)',
  danger: '#FF5C72',
  white: '#FFFFFF',
};

export const Gradients = {
  brand: ['#34E0A1', '#22D3EE'] as const,
  brandVertical: ['#34E0A1', '#22D3EE'] as const,
  aurora: ['#0E3B2E', '#0B2746', '#281A4D'] as const,
  glow: ['rgba(52,224,161,0.50)', 'rgba(34,211,238,0.28)'] as const,
};

export const Radius = {
  xs: 10,
  sm: 14,
  md: 20,
  lg: 28,
  xl: 36,
  full: 999,
};

export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 30,
  xxl: 46,
};

export const FontSize = {
  xxs: 11,
  xs: 12,
  sm: 14,
  md: 16,
  lg: 19,
  xl: 25,
  xxl: 34,
  display: 48,
};

export const Font = {
  display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) as string,
  body: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }) as string,
};

export const Shadow = {
  glass: '0 10px 34px rgba(0,0,0,0.45)',
  glow: '0 8px 30px rgba(52,224,161,0.25)',
  elevated: '0 14px 34px rgba(0,0,0,0.55)',
  fab: '0 12px 30px rgba(52,224,161,0.38)',
};
