// Dark Purple & Black - PrizePicks Premium
const colors = {
  // Primary colors - Deep vibrant purple
  primary: '#8B5CF6', // Vibrant purple
  primaryDark: '#7C3AED',
  primaryLight: '#A78BFA',
  secondary: '#C084FC', // Light purple
  
  // Gradient colors - Very dark purple to black
  gradientStart: '#1E0A3C', // Very dark purple
  gradientEnd: '#000000', // Pure black
  
  // Dark theme backgrounds
  background: '#000000', // Pure black
  cardBackground: '#0F0A1F', // Very dark purple-black
  surface: '#1A0F2E', // Dark purple surface
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#C4B5FD',
  textMuted: '#8B7FC7',
  
  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  
  // Accent colors
  accent: '#8B5CF6',
  gold: '#FCD34D',
  
  // Borders - Dark with purple tint
  border: '#2D1B4E',
  borderLight: '#3D2B5E',
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
