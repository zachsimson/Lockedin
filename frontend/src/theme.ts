// FanDuel-inspired color scheme
export const colors = {
  // Primary colors
  primary: '#1FB958', // FanDuel bright green
  primaryDark: '#159A47',
  primaryLight: '#4ADE80',
  
  // Dark theme backgrounds
  background: '#0E1E25',
  cardBackground: '#1A2B34',
  surface: '#243642',
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  
  // Status colors
  success: '#1FB958',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  
  // Accent colors
  accent: '#10B981',
  gold: '#FFD700',
  
  // Borders
  border: '#334155',
  borderLight: '#475569',
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
};

export const typography = {
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
