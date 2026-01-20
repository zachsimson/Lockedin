// Dark Purple & Black - PrizePicks Style
const colors = {
  // Primary colors - Deep purple like PrizePicks
  primary: '#6B46C1', // Deep purple
  primaryDark: '#553C9A',
  primaryLight: '#805AD5',
  secondary: '#9F7AEA', // Light purple
  
  // Gradient colors - Dark purple gradient
  gradientStart: '#1a0033', // Very dark purple
  gradientEnd: '#000000', // Pure black
  
  // Dark theme backgrounds
  background: '#000000', // Pure black
  cardBackground: '#0D0D1A', // Very dark purple-black
  surface: '#1A1A2E', // Dark surface
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#B8B8D1',
  textMuted: '#6E6E8F',
  
  // Status colors
  success: '#00E676',
  warning: '#FFC107',
  danger: '#FF1744',
  info: '#00B0FF',
  
  // Accent colors
  accent: '#6B46C1',
  gold: '#FFD700',
  
  // Borders - Darker
  border: '#1F1F35',
  borderLight: '#2A2A40',
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
