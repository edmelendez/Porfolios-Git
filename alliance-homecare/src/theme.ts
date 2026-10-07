import { Platform } from 'react-native';

export const colors = {
  black: '#000000',
  panel: '#0B0F19',
  red: '#FF2D55',
  redDeep: '#B41437',
  redDark: '#640519',
  purple: '#AF52DE',
  yellow: '#FFCC00',
  green: '#22C55E',
  greenDeep: '#15803D',
  emerald: '#34D399',
  cyan: '#22D3EE',
  white: '#FFFFFF',
  text: '#F8FAFC',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate600: '#475569',
  glass: 'rgba(255,255,255,0.05)',
  glassStrong: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.15)',
};

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  black: 'Inter_900Black',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};
