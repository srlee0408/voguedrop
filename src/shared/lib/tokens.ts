export const tokens = {
  colors: {
    // Primary palette
    primary: {
      50: 'rgb(240, 253, 244)',
      100: 'rgb(220, 252, 231)',
      200: 'rgb(187, 247, 208)',
      300: 'rgb(134, 239, 172)',
      400: 'rgb(74, 222, 128)',
      500: 'rgb(34, 197, 94)',
      600: 'rgb(22, 163, 74)',
      700: 'rgb(21, 128, 61)',
      800: 'rgb(22, 101, 52)',
      900: 'rgb(20, 83, 45)',
      DEFAULT: 'rgb(56, 244, 124)', // #38f47c
    },
    
    // Secondary palette
    secondary: {
      50: 'rgb(240, 253, 244)',
      100: 'rgb(220, 252, 231)',
      200: 'rgb(187, 247, 208)',
      300: 'rgb(134, 239, 172)',
      400: 'rgb(74, 222, 128)',
      500: 'rgb(52, 199, 89)', // #34C759
      600: 'rgb(22, 163, 74)',
      700: 'rgb(21, 128, 61)',
      800: 'rgb(22, 101, 52)',
      900: 'rgb(20, 83, 45)',
      DEFAULT: 'rgb(52, 199, 89)',
    },
    
    // Neutral palette
    gray: {
      50: 'rgb(249, 250, 251)',
      100: 'rgb(243, 244, 246)',
      200: 'rgb(229, 231, 235)',
      300: 'rgb(209, 213, 219)',
      400: 'rgb(156, 163, 175)',
      500: 'rgb(107, 114, 128)',
      600: 'rgb(75, 85, 99)',
      700: 'rgb(55, 65, 81)',
      800: 'rgb(31, 41, 55)',
      900: 'rgb(17, 24, 39)',
      950: 'rgb(3, 7, 18)',
    },
    
    // Semantic colors
    background: {
      primary: 'rgb(0, 0, 0)',
      secondary: 'rgb(17, 24, 39)',
      tertiary: 'rgb(31, 41, 55)',
      inverse: 'rgb(255, 255, 255)',
    },
    
    surface: {
      primary: 'rgb(17, 24, 39)',
      secondary: 'rgb(31, 41, 55)',
      tertiary: 'rgb(55, 65, 81)',
      elevated: 'rgb(31, 41, 55)',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    
    text: {
      primary: 'rgb(255, 255, 255)',
      secondary: 'rgb(209, 213, 219)',
      tertiary: 'rgb(156, 163, 175)',
      inverse: 'rgb(17, 24, 39)',
      disabled: 'rgb(107, 114, 128)',
    },
    
    border: {
      primary: 'rgb(55, 65, 81)',
      secondary: 'rgb(31, 41, 55)',
      tertiary: 'rgb(17, 24, 39)',
    },
    
    // State colors
    error: {
      DEFAULT: 'rgb(239, 68, 68)',
      light: 'rgb(254, 202, 202)',
      dark: 'rgb(185, 28, 28)',
    },
    
    warning: {
      DEFAULT: 'rgb(245, 158, 11)',
      light: 'rgb(254, 215, 170)',
      dark: 'rgb(180, 83, 9)',
    },
    
    success: {
      DEFAULT: 'rgb(34, 197, 94)',
      light: 'rgb(187, 247, 208)',
      dark: 'rgb(22, 101, 52)',
    },
    
    info: {
      DEFAULT: 'rgb(59, 130, 246)',
      light: 'rgb(191, 219, 254)',
      dark: 'rgb(30, 64, 175)',
    },
  },
  
  spacing: {
    0: '0',
    px: '1px',
    0.5: '0.125rem', // 2px
    1: '0.25rem', // 4px
    1.5: '0.375rem', // 6px
    2: '0.5rem', // 8px
    2.5: '0.625rem', // 10px
    3: '0.75rem', // 12px
    3.5: '0.875rem', // 14px
    4: '1rem', // 16px
    5: '1.25rem', // 20px
    6: '1.5rem', // 24px
    7: '1.75rem', // 28px
    8: '2rem', // 32px
    9: '2.25rem', // 36px
    10: '2.5rem', // 40px
    11: '2.75rem', // 44px
    12: '3rem', // 48px
    14: '3.5rem', // 56px
    16: '4rem', // 64px
    20: '5rem', // 80px
    24: '6rem', // 96px
    28: '7rem', // 112px
    32: '8rem', // 128px
    36: '9rem', // 144px
    40: '10rem', // 160px
    44: '11rem', // 176px
    48: '12rem', // 192px
    52: '13rem', // 208px
    56: '14rem', // 224px
    60: '15rem', // 240px
    64: '16rem', // 256px
    72: '18rem', // 288px
    80: '20rem', // 320px
    96: '24rem', // 384px
  },
  
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      serif: ['Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      mono: ['Fira Code', 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', 'monospace'],
    },
    
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }], // 12px
      sm: ['0.875rem', { lineHeight: '1.25rem' }], // 14px
      base: ['1rem', { lineHeight: '1.5rem' }], // 16px
      lg: ['1.125rem', { lineHeight: '1.75rem' }], // 18px
      xl: ['1.25rem', { lineHeight: '1.75rem' }], // 20px
      '2xl': ['1.5rem', { lineHeight: '2rem' }], // 24px
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
      '5xl': ['3rem', { lineHeight: '1' }], // 48px
      '6xl': ['3.75rem', { lineHeight: '1' }], // 60px
      '7xl': ['4.5rem', { lineHeight: '1' }], // 72px
      '8xl': ['6rem', { lineHeight: '1' }], // 96px
      '9xl': ['8rem', { lineHeight: '1' }], // 128px
    },
    
    fontWeight: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
    
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
    
    lineHeight: {
      none: '1',
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2',
    },
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
    sm: '0.125rem', // 2px
    DEFAULT: '0.25rem', // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
    xl: '0.75rem', // 12px
    '2xl': '1rem', // 16px
    '3xl': '1.5rem', // 24px
    full: '9999px',
    
    // Component specific
    button: '0.5rem', // 8px
    input: '0.375rem', // 6px
    card: '0.75rem', // 12px
    modal: '1rem', // 16px
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    none: 'none',
    
    // Colored shadows
    primary: '0 4px 14px 0 rgba(56, 244, 124, 0.3)',
    secondary: '0 4px 14px 0 rgba(52, 199, 89, 0.3)',
  },
  
  transitions: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    
    timing: {
      DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  
  animation: {
    spin: 'spin 1s linear infinite',
    ping: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
    pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    bounce: 'bounce 1s infinite',
    
    // Custom animations
    gradient: 'gradient 3s ease infinite',
    glitch: 'glitch 2s linear infinite',
    wave: 'wave 3s ease-in-out infinite',
    fadeIn: 'fadeIn 0.5s ease-out',
    fadeOut: 'fadeOut 0.5s ease-out',
    slideUp: 'slideUp 0.3s ease-out',
    slideDown: 'slideDown 0.3s ease-out',
  },
  
  zIndex: {
    0: '0',
    10: '10',
    20: '20',
    30: '30',
    40: '40',
    50: '50',
    auto: 'auto',
    
    // Semantic z-index
    dropdown: '1000',
    sticky: '1020',
    fixed: '1030',
    modalBackdrop: '1040',
    modal: '1050',
    popover: '1060',
    tooltip: '1070',
    notification: '1080',
  },
} as const

export type Tokens = typeof tokens