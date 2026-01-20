// LockedIn - PrizePicks-Style Premium Dark Theme
const colors = {
  // Exact PrizePicks colors
  background: '#0E1117',
  cardBackground: '#161A23',
  surface: '#1A1F2C',
  divider: '#222634',
  
  // Primary accents
  primary: '#00F5A0', // PrizePicks green-teal
  secondary: '#00C2FF', // Cyan accent
  danger: '#FF4D4F',
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A7B3',
  textMuted: '#6B7280',
  
  // Status colors
  success: '#00F5A0',
  warning: '#FFB800',
  info: '#00C2FF',
  
  // Accent colors
  accent: '#00F5A0',
  gold: '#FFD700',
  
  // Borders
  border: '#222634',
  borderLight: '#2A2F3D',
  
  // Gradient
  gradientStart: '#0E1117',
  gradientEnd: '#000000',
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
