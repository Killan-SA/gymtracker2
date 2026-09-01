export const COLORS = {
  // Bleu électrique - couleur principale
  primary: '#0066FF',
  primaryLight: '#338DFF',
  primaryDark: '#0047CC',
  primaryGlow: 'rgba(0, 102, 255, 0.18)',
  primaryGlowStrong: 'rgba(0, 102, 255, 0.35)',

  // Arrière-plans (mode sombre)
  background: '#09090F',
  surface: '#111119',
  card: '#17172A',
  cardBorder: '#22223A',
  cardBorderActive: '#0066FF',

  // Textes
  textPrimary: '#FFFFFF',
  textSecondary: '#8B8FA8',
  textMuted: '#45455F',

  // États
  success: '#00D68F',
  successGlow: 'rgba(0, 214, 143, 0.15)',
  warning: '#FFB800',
  warningGlow: 'rgba(255, 184, 0, 0.15)',
  danger: '#FF3B5C',
  dangerGlow: 'rgba(255, 59, 92, 0.15)',

  // Tab bar
  tabBarBg: '#111119',
  tabBarBorder: '#22223A',
  tabActive: '#0066FF',
  tabInactive: '#45455F',

  // Séparateurs
  separator: '#1C1C30',
};

export const FONTS = {
  // Tailles
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 38,

  // Poids
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const SHADOWS = {
  primary: {
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
};
