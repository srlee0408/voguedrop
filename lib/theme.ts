export const theme = {
  colors: {
    vogue: {
      primary: '#38f47cf9', // 기존 프로젝트의 메인 색상
      secondary: '#34C759',
      light: '#5CE574',
      dark: '#2FA544',
    },
    gray: {
      900: '#111827',
      800: '#1f2937',
      700: '#374151',
      600: '#4b5563',
      500: '#6b7280',
      400: '#9ca3af',
      300: '#d1d5db',
    },
    black: '#000000',
    white: '#ffffff',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    DEFAULT: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '2rem',
    full: '9999px',
    button: '0.5rem',
  },
  transitions: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
} as const;

export type Theme = typeof theme;