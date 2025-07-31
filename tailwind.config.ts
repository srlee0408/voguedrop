import type { Config } from "tailwindcss"
import { tokens } from "./lib/tokens"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
          50: tokens.colors.primary[50],
          100: tokens.colors.primary[100],
          200: tokens.colors.primary[200],
          300: tokens.colors.primary[300],
          400: tokens.colors.primary[400],
          500: tokens.colors.primary[500],
          600: tokens.colors.primary[600],
          700: tokens.colors.primary[700],
          800: tokens.colors.primary[800],
          900: tokens.colors.primary[900],
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
          50: tokens.colors.secondary[50],
          100: tokens.colors.secondary[100],
          200: tokens.colors.secondary[200],
          300: tokens.colors.secondary[300],
          400: tokens.colors.secondary[400],
          500: tokens.colors.secondary[500],
          600: tokens.colors.secondary[600],
          700: tokens.colors.secondary[700],
          800: tokens.colors.secondary[800],
          900: tokens.colors.secondary[900],
        },
        destructive: {
          DEFAULT: "rgb(var(--destructive) / <alpha-value>)",
          foreground: "rgb(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "rgb(var(--popover) / <alpha-value>)",
          foreground: "rgb(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)",
        },
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          foreground: "rgb(var(--surface-foreground) / <alpha-value>)",
        },
        "text-secondary": "rgb(var(--muted-foreground) / <alpha-value>)",
        gray: tokens.colors.gray,
        error: tokens.colors.error,
        warning: tokens.colors.warning,
        success: tokens.colors.success,
        info: tokens.colors.info,
      },
      spacing: tokens.spacing,
      fontSize: Object.fromEntries(
        Object.entries(tokens.typography.fontSize).map(([key, value]) => {
          if (Array.isArray(value)) {
            const [size, config] = value;
            return [key, [size, { ...config }]];
          }
          return [key, value];
        })
      ) as any,
      fontWeight: tokens.typography.fontWeight,
      letterSpacing: tokens.typography.letterSpacing,
      lineHeight: tokens.typography.lineHeight,
      fontFamily: Object.fromEntries(
        Object.entries(tokens.typography.fontFamily).map(([key, value]) => [
          key,
          [...value],
        ])
      ),
      borderRadius: {
        ...tokens.borderRadius,
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
      boxShadow: tokens.shadows,
      transitionDuration: tokens.transitions.duration,
      transitionTimingFunction: tokens.transitions.timing,
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        spin: {
          to: { transform: "rotate(360deg)" },
        },
        ping: {
          "75%, 100%": {
            transform: "scale(2)",
            opacity: "0",
          },
        },
        pulse: {
          "50%": {
            opacity: ".5",
          },
        },
        bounce: {
          "0%, 100%": {
            transform: "translateY(-25%)",
            "animation-timing-function": "cubic-bezier(0.8,0,1,1)",
          },
          "50%": {
            transform: "none",
            "animation-timing-function": "cubic-bezier(0,0,0.2,1)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        spin: "spin 1s linear infinite",
        ping: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        bounce: "bounce 1s infinite",
      },
      zIndex: tokens.zIndex,
      screens: tokens.breakpoints,
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
