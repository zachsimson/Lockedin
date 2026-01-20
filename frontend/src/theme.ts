// DraftKings-Style Color Scheme - Green & Black
const colors = {
  // Primary colors - DraftKings bright green
  primary: '#53D337', // Bright neon green
  primaryDark: '#42A82A',
  primaryLight: '#6FE04C',
  secondary: '#1DB954', // Spotify-style green
  
  // Gradient colors - Dark to black
  gradientStart: '#0a1f0a', // Very dark green
  gradientEnd: '#000000', // Pure black
  
  // Dark theme backgrounds
  background: '#000000', // Pure black
  cardBackground: '#0D1F0D', // Very dark green-black
  surface: '#1A2E1A', // Dark surface with green tint
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#B8D1B8',
  textMuted: '#6E8F6E',
  
  // Status colors
  success: '#53D337',
  warning: '#FFC107',
  danger: '#FF1744',
  info: '#00B0FF',
  
  // Accent colors
  accent: '#53D337',
  gold: '#FFD700',
  
  // Borders - Darker with green tint
  border: '#1F351F',
  borderLight: '#2A402A',
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
