import { Platform } from 'react-native';

// Design System tokens (web + native)
// Colors palette inspired by vintage Japanese aesthetics used in the prototype
export const colors = {
  primary: {
    beige: '#F5F2E9',
    sand: '#EBE6D9',
  },
  accent: {
    green: '#5E8B7E',
    rust: '#A65A45',
  },
  text: {
    primary: '#2C2C2C',
    secondary: '#5F5F5F',
    inverse: '#F5F2E9',
  },
  border: {
    light: '#D9D2C0',
    medium: '#CFC8B8',
  },
  surface: {
    paper: '#FFFCF5',
    white: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.05)'
  }
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const borderRadius = {
  md: 8,
  lg: 12,
  xl: 20,
} as const;

export const typography = {
  fontSize: {
    small: 12,
    body: 16,
    h3: 20,
    h2: 24,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    normal: 20,
    relaxed: 24,
  },
} as const;

// Cross-platform shadows
// On web: use CSS boxShadow to silence RNW deprecation warnings
// On native: keep iOS shadow* + Android elevation
const makeShadow = (
  web: string,
  ios: { color: string; offsetY: number; radius: number; opacity: number },
  elevation: number
) =>
  Platform.select({
    web: { boxShadow: web },
    default: {
      shadowColor: ios.color,
      shadowOffset: { width: 0, height: ios.offsetY },
      shadowOpacity: ios.opacity,
      shadowRadius: ios.radius,
      elevation,
    },
  })!;

export const shadows = {
  sm: makeShadow('0 1px 2px rgba(0,0,0,0.08)', {
    color: 'rgba(0,0,0,0.25)', offsetY: 1, radius: 2, opacity: 0.15,
  }, 1),
  md: makeShadow('0 4px 8px rgba(0,0,0,0.10)', {
    color: 'rgba(0,0,0,0.25)', offsetY: 3, radius: 4, opacity: 0.18,
  }, 3),
  lg: makeShadow('0 8px 16px rgba(0,0,0,0.12)', {
    color: 'rgba(0,0,0,0.25)', offsetY: 6, radius: 8, opacity: 0.2,
  }, 6),
  xl: makeShadow('0 12px 24px rgba(0,0,0,0.14)', {
    color: 'rgba(0,0,0,0.3)', offsetY: 10, radius: 14, opacity: 0.22,
  }, 10),
} as const;

export default {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
};