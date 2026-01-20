// PrizePicks-inspired color scheme
const colors = {
  // Primary colors - PrizePicks pink/purple
  primary: '#FF2D55', // Hot pink
  primaryDark: '#D81B60',
  primaryLight: '#FF6B9D',
  secondary: '#9C27B0', // Purple
  
  // Gradient colors
  gradientStart: '#FF2D55',
  gradientEnd: '#9C27B0',
  
  // Dark theme backgrounds
  background: '#0A0E27',
  cardBackground: '#1A1F3A',
  surface: '#252B48',
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#B4B8D4',
  textMuted: '#6B7096',
  
  // Status colors
  success: '#00E676',
  warning: '#FFD600',
  danger: '#FF1744',
  info: '#00B0FF',
  
  // Accent colors
  accent: '#00E5FF',
  gold: '#FFD700',
  
  // Borders
  border: '#2E3454',
  borderLight: '#3D4461',
};

const shadows = {
  small: {
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  medium: {
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  large: {
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
};

const typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: colors.textPrimary,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: colors.textPrimary,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 14,
    color: colors.textMuted,
  },
};

export { colors, shadows, typography };
