import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

// Import design tokens
import { colors, typography, borderRadius, animation } from "./src/styles/design-tokens";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        // === NEW DESIGN SYSTEM ===
        // Primary: Electric Cyan
        neon: {
          cyan: colors.primary.DEFAULT,
          'cyan-muted': colors.primary.muted,
          green: colors.success.DEFAULT,
          'green-muted': colors.success.muted,
          amber: colors.warning.DEFAULT,
          'amber-muted': colors.warning.muted,
          red: colors.danger.DEFAULT,
          'red-muted': colors.danger.muted,
        },
        
        // Backgrounds
        surface: {
          DEFAULT: colors.background.primary,
          primary: colors.background.primary,
          secondary: colors.background.secondary,
          tertiary: colors.background.tertiary,
          elevated: colors.background.elevated,
          hover: colors.background.hover,
        },

        // Text
        content: {
          DEFAULT: colors.text.primary,
          primary: colors.text.primary,
          secondary: colors.text.secondary,
          muted: colors.text.muted,
          disabled: colors.text.disabled,
          inverse: colors.text.inverse,
        },

        // Borders
        line: {
          DEFAULT: colors.border.DEFAULT,
          muted: colors.border.muted,
          accent: colors.border.accent,
          focus: colors.border.focus,
        },

        // Status colors
        status: colors.status,

        // Rank colors
        rank: colors.rank,

        // Chart colors
        chart: colors.chart,

        // === LEGACY SUPPORT (gradually phase out) ===
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        
        // Legacy terminal colors (mapped to new system)
        terminal: {
          bg: colors.background.secondary,
          text: colors.text.primary,
          accent: colors.primary.DEFAULT,
          highlight: colors.warning.DEFAULT,
          green: colors.success.DEFAULT,
          cyan: colors.primary.DEFAULT,
          red: colors.danger.DEFAULT,
        },
        'terminal-bg': colors.background.secondary,
        'terminal-text': colors.text.primary,
        'terminal-accent': colors.primary.DEFAULT,
        'terminal-accent-secondary': colors.primary.muted,
        
        sidebar: {
          DEFAULT: colors.background.secondary,
          foreground: colors.text.secondary,
          border: colors.border.DEFAULT,
        },
        
        // Legacy color mappings
        'bg-primary': colors.background.primary,
        'bg-panel': colors.background.secondary,
        'bg-sidebar': colors.background.secondary,
        'text-main': colors.text.primary,
        'text-secondary': colors.text.secondary,
        'accent-primary': colors.primary.DEFAULT,
        'accent-secondary': colors.primary.muted,
        'accent-highlight': colors.warning.DEFAULT,
        'accent-red': colors.danger.DEFAULT,
        'accent-orange': colors.warning.DEFAULT,
        'accent-amber': colors.warning.DEFAULT,
        'accent-cyan': colors.primary.DEFAULT,
        'accent-yellow': colors.warning.DEFAULT,
        'line-faint': colors.border.muted,
      },
      
      fontFamily: {
        // New design system fonts
        mono: [...typography.fontFamily.mono],
        display: [...typography.fontFamily.display],
        body: [...typography.fontFamily.body],
        // Legacy support
        'cyberpunk': ['Space Grotesk', 'Rajdhani', 'system-ui', 'sans-serif'],
      },
      
      fontSize: typography.fontSize,
      
      letterSpacing: typography.letterSpacing,
      
      borderRadius: {
        lg: borderRadius.lg,
        md: borderRadius.md,
        sm: borderRadius.sm,
        xl: borderRadius.xl,
        '2xl': borderRadius['2xl'],
      },
      
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 240, 255, 0.3)',
        'glow-green': '0 0 20px rgba(0, 255, 136, 0.3)',
        'glow-amber': '0 0 20px rgba(255, 184, 0, 0.3)',
        'glow-red': '0 0 20px rgba(255, 51, 102, 0.3)',
        'glow-cyan-lg': '0 0 40px rgba(0, 240, 255, 0.4)',
        'glow-green-lg': '0 0 40px rgba(0, 255, 136, 0.4)',
      },
      
      keyframes: {
        // === NEW ANIMATIONS ===
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 240, 255, 0.5)' },
        },
        'progress-fill': {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress-width, 100%)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        
        // === LEGACY ANIMATIONS ===
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'typewriter': {
          '0%': { width: '0%' },
          '100%': { width: '100%' }
        },
        'blink-cursor': {
          '0%, 100%': { opacity: '0' },
          '50%': { opacity: '1' },
        },
        'flicker': {
          '0%': { opacity: '1.0' },
          '49%': { opacity: '1.0' },
          '50%': { opacity: '0.8' },
          '51%': { opacity: '1.0' },
          '80%': { opacity: '1.0' },
          '81%': { opacity: '0.9' },
          '82%': { opacity: '1.0' },
          '83%': { opacity: '0.95' },
          '84%': { opacity: '1.0' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100vh)' }
        }
      },
      
      animation: {
        // New animations
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.2s ease-out',
        'slide-in-up': 'slide-in-up 0.3s ease-out',
        'slide-in-down': 'slide-in-down 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'count-up': 'count-up 0.5s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'progress-fill': 'progress-fill 0.5s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
        
        // Legacy animations
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
        'typewriter': 'typewriter 2s steps(40, end) both',
        'blink-cursor': 'blink-cursor 0.75s step-end infinite',
        'flicker': 'flicker 0.3s ease-in-out 1',
        'scan-line': 'scan-line 5s linear infinite'
      },
      
      transitionDuration: {
        'fast': animation.duration.fast,
        'normal': animation.duration.normal,
        'slow': animation.duration.slow,
      },
      
      transitionTimingFunction: {
        'spring': animation.easing.spring,
      },
    }
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
