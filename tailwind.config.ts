import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

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
				terminal: {
					bg: 'var(--bg-panel)',
					text: 'var(--text-main)',
					accent: 'var(--accent-orange)',
					highlight: 'var(--accent-amber)',
					green: 'var(--accent-cyan)',
					cyan: 'var(--accent-cyan)',
					red: 'var(--accent-red)',
				},
				'terminal-bg': 'var(--terminal-bg)',
				'terminal-text': 'var(--terminal-text)',
				'terminal-accent': 'var(--terminal-accent)',
				'terminal-accent-secondary': 'var(--terminal-accent-secondary)',
				sidebar: {
					DEFAULT: 'var(--bg-sidebar)',
					foreground: 'var(--text-muted)',
					border: 'var(--accent-orange)',
				},
				'bg-primary': 'var(--bg-primary)',
				'bg-panel': 'var(--bg-panel)',
				'bg-sidebar': 'var(--bg-sidebar)',
				'text-main': 'var(--text-main)',
				'text-secondary': 'var(--text-muted)',
				'accent-primary': 'var(--accent-red)',
				'accent-secondary': 'var(--accent-orange)',
				'accent-highlight': 'var(--accent-amber)',
				'hover-bg': 'var(--accent-red)',
				'hover-text': 'var(--bg-primary)',
				'cursor-color': 'var(--accent-red)',
				'accent-red': 'var(--accent-red)',
				'accent-orange': 'var(--accent-orange)',
				'accent-amber': 'var(--accent-amber)',
				'accent-cyan': 'var(--accent-cyan)',
				'accent-yellow': 'var(--accent-yellow)',
				'line-faint': 'var(--line-faint)',
			},
			fontFamily: {
				'mono': ['Fira Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
				'cyberpunk': ['Rajdhani', 'ui-sans-serif', 'system-ui', 'sans-serif'],
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
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
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
				'typewriter': 'typewriter 2s steps(40, end) both',
				'blink-cursor': 'blink-cursor 0.75s step-end infinite',
				'flicker': 'flicker 0.3s ease-in-out 1',
				'scan-line': 'scan-line 5s linear infinite'
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
