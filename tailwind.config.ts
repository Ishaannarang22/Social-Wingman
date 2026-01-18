import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			display: [
  				'var(--font-playfair)',
  				'Playfair Display',
  				'serif'
  			],
  			sans: [
  				'var(--font-inter)',
  				'Inter',
  				'system-ui',
  				'sans-serif'
  			],
  			mono: [
  				'var(--font-mono)',
  				'JetBrains Mono',
  				'monospace'
  			]
  		},
  		colors: {
  			/* Pastel Matcha Color Palette */
  			battery: {
  				critical: '#e8a5a5',  /* pastel rose */
  				low: '#e8c9a5',       /* pastel peach */
  				medium: '#e8dda5',    /* pastel cream */
  				good: '#b8d4a8',      /* matcha green pastel */
  				full: '#9fc490'       /* deeper matcha */
  			},
  			accent: {
  				primary: '#b8d4a8',   /* matcha green */
  				secondary: '#a5c4d4', /* pastel sage blue */
  				purple: '#c9b8d4',    /* pastel lavender */
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			matcha: {
  				50: '#f4f7f2',
  				100: '#e6ede2',
  				200: '#d0dfc8',
  				300: '#b8d4a8',       /* main matcha */
  				400: '#9fc490',
  				500: '#7dad70',
  				600: '#628c58',
  				700: '#4d6e46',
  				800: '#41593c',
  				900: '#384a34'
  			},
  			surface: {
  				DEFAULT: '#000000',   /* pure black */
  				elevated: '#0a0a0a',
  				overlay: '#111111'
  			},
  			glass: {
  				bg: 'rgba(184, 212, 168, 0.05)',  /* matcha tinted glass */
  				border: 'rgba(184, 212, 168, 0.15)'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		animation: {
  			'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  			'fade-in': 'fadeIn 0.3s ease-in-out',
  			'slide-up': 'slideUp 0.3s ease-out',
  			'slide-in-bottom': 'slideInBottom 0.3s ease-out',
  			'scale-in': 'scaleIn 0.2s ease-out',
  			'glow-pulse': 'glowPulse 2s ease-in-out infinite',
  			'charge': 'charge 0.5s ease-out',
  			'drain': 'drain 1s ease-out',
  			'shake': 'shake 0.5s ease-in-out',
  			'confetti': 'confetti 0.8s ease-out'
  		},
  		keyframes: {
  			fadeIn: {
  				'0%': {
  					opacity: '0'
  				},
  				'100%': {
  					opacity: '1'
  				}
  			},
  			slideUp: {
  				'0%': {
  					transform: 'translateY(10px)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translateY(0)',
  					opacity: '1'
  				}
  			},
  			slideInBottom: {
  				'0%': {
  					transform: 'translateY(100%)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translateY(0)',
  					opacity: '1'
  				}
  			},
  			scaleIn: {
  				'0%': {
  					transform: 'scale(0.9)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'scale(1)',
  					opacity: '1'
  				}
  			},
  			glowPulse: {
  				'0%, 100%': {
  					opacity: '0.6',
  					filter: 'blur(8px)'
  				},
  				'50%': {
  					opacity: '1',
  					filter: 'blur(12px)'
  				}
  			},
  			charge: {
  				'0%': {
  					strokeDashoffset: '282.6'
  				},
  				'100%': {
  					strokeDashoffset: '0'
  				}
  			},
  			drain: {
  				'0%': {
  					strokeDashoffset: '0'
  				},
  				'100%': {
  					strokeDashoffset: '282.6'
  				}
  			},
  			shake: {
  				'0%, 100%': {
  					transform: 'translateX(0)'
  				},
  				'10%, 30%, 50%, 70%, 90%': {
  					transform: 'translateX(-2px)'
  				},
  				'20%, 40%, 60%, 80%': {
  					transform: 'translateX(2px)'
  				}
  			},
  			confetti: {
  				'0%': {
  					transform: 'translateY(0) rotate(0)',
  					opacity: '1'
  				},
  				'100%': {
  					transform: 'translateY(-100px) rotate(720deg)',
  					opacity: '0'
  				}
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
