import { tokens } from './tokens';

// Re-export tokens for backward compatibility
export const theme = {
  colors: {
    vogue: {
      primary: tokens.colors.primary.DEFAULT,
      secondary: tokens.colors.secondary.DEFAULT,
      light: tokens.colors.primary[300],
      dark: tokens.colors.primary[700],
    },
    gray: tokens.colors.gray,
    black: tokens.colors.background.primary,
    white: tokens.colors.background.inverse,
  },
  breakpoints: tokens.breakpoints,
  borderRadius: tokens.borderRadius,
  transitions: tokens.transitions.duration,
} as const;

export type Theme = typeof theme;

// Export tokens for direct use
export { tokens };