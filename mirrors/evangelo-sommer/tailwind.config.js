/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Adobe Fonts Typography System - Brand Guidelines
      fontFamily: {
        'primary': ['ff-utility-web-pro', 'sans-serif'],   // FF Utility Web Pro - Primary Interface
        'body': ['ibm-plex-sans', 'sans-serif'],           // IBM Plex Sans - Body Text
        'mono': ['letter-gothic-std', 'monospace'],        // Letter Gothic Std - Technical Data
        'condensed': ['din-2014-narrow', 'sans-serif'],    // DIN 2014 Narrow - Condensed Elements
        'display': ['lores-9-wide', 'sans-serif'],         // LoRes 9 Wide - Display Headers
        'accent': ['termina', 'sans-serif'],               // Termina - Accent Elements
        
        // Brand Guidelines Utility Classes
        'interface': ['ff-utility-web-pro', 'sans-serif'], // Interface elements
        'technical': ['letter-gothic-std', 'monospace'],   // Technical data/code
        'compact': ['din-2014-narrow', 'sans-serif'],      // Sidebar/compact areas
        
        // Legacy Support
        'hud-display': ['lores-9-wide', 'sans-serif'],
        'hud-ui': ['ff-utility-web-pro', 'sans-serif'],
        'hud-mono': ['letter-gothic-std', 'monospace'],
        'space-grotesk': ['lores-9-wide', 'sans-serif'],  // Legacy mapping
        'jetbrains-mono': ['letter-gothic-std', 'monospace'], // Legacy mapping
      },
      
      // Tactical HUD Color Palette - Brand Guidelines
      colors: {
        'tactical-white': '#FFFFFF',
        'tactical-gold': {
          DEFAULT: '#D4AF37',
          50: '#FDF8E8',
          100: '#F8E8B8',
          200: '#F4E4A6',
          300: '#E6C866',
          400: '#D4AF37',
          500: '#D4AF37',
          600: '#B8941F',
          700: '#9A7A1A',
          800: '#7D6214',
          900: '#604B0F',
        },
        'tactical-brown': {
          DEFAULT: '#8B4513',
          50: '#F4E6D7',
          100: '#E6C2A6',
          200: '#CD853F',
          300: '#B8651F',
          400: '#A0522D',
          500: '#8B4513',
          600: '#7D3B10',
          700: '#654321',
          800: '#523610',
          900: '#3E2A0C',
        },
        'tactical-grey': {
          50: '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
          1000: '#0C0A09',
        },
        tactical: {
          white: '#FFFFFF',
          gold: {
            DEFAULT: '#D4AF37',
            light: '#E6C866',
            dark: '#B8941F',
            muted: '#F4E4A6',
          },
          brown: {
            DEFAULT: '#8B4513',
            light: '#A0522D',
            dark: '#654321',
            warm: '#CD853F',
          },
          grey: {
            900: '#111827',
            800: '#1F2937',
            700: '#374151',
            600: '#4B5563',
            500: '#6B7280',
            400: '#9CA3AF',
            300: '#D1D5DB',
            200: '#E5E7EB',
            100: '#F3F4F6',
          }
        },
        
        // Semantic Colors - Pure Warm Gold Scheme (ZERO BLUE)
        'hud-success': '#10B981',    // Green (positive/confirmed states)
        'hud-warning': '#F59E0B',    // Amber (cautionary alerts) 
        'hud-error': '#EF4444',      // Red (critical system alerts)
        'hud-info': '#D4AF37',       // Tactical Gold (NO BLUE - only gold for info)
        
        // Tactical Accents - Warm Gold Palette Only
        'radar-green': '#00FF41',    // Bright green for active radar sweeps
        'alert-red': '#FF0000',      // Critical red for alarms
        'system-amber': '#FFB000',   // Amber system notifications
        'tactical-amber': '#FFC947', // Lighter amber for highlights
        'system-gold': '#D4AF37',    // Gold for system status (replaces any blue)
        
        // Data Visualization Spectrum - Warm Gold Palette (No Blue)
        'data-red-severe': '#8B0000',
        'data-red-major': '#DC143C', 
        'data-orange': '#FF8C00',
        'data-yellow': '#FFD700',
        'data-green-mild': '#32CD32',
        'data-green-good': '#00FF7F',
        'data-teal': '#20B2AA',
        'data-cyan': '#00FFFF',
        'data-gold-bright': '#FFD700',   // Replaced blue with bright gold
        'data-amber-warm': '#FFC947',    // Warm amber for highlights
        'data-violet': '#8A2BE2',
        'data-pink': '#FF1493',
        'data-crimson': '#DC143C',
        
        // Legacy Support
        gold: '#D4AF37',
        'gold-light': '#E6C866',
        'gold-dark': '#B8941F',
        'dark-grey': '#1F2937',
        'medium-grey': '#6B7280',
        'light-grey': '#E5E7EB',
        'off-white': '#F3F4F6',
        'hud-background-primary': 'var(--hud-background-primary)',
        'hud-background-secondary': 'var(--hud-background-secondary)',
        'hud-text-primary': 'var(--hud-text-primary)',
        'hud-text-secondary': 'var(--hud-text-secondary)',
        'hud-border': 'var(--hud-border)',
        'hud-border-accent': 'var(--hud-border-accent)',
      },
      
      // Typography Scale - Brand Guidelines Hierarchy
      fontSize: {
        // Display / Page Titles - Halogen Bold/Black
        'hero': ['3rem', { lineHeight: '1.1', fontWeight: '700' }],      // 48px - H1 Hero
        'section': ['2.25rem', { lineHeight: '1.2', fontWeight: '700' }], // 36px - H2 Section
        'subsection': ['1.5rem', { lineHeight: '1.3', fontWeight: '400' }], // 24px - H3 Subsection
        'component': ['1.25rem', { lineHeight: '1.3', fontWeight: '400' }], // 20px - H4 Component
        'label-header': ['1rem', { lineHeight: '1.4', fontWeight: '400' }], // 16px - H5 Label
        
        // Body Text - IBM Plex Sans
        'body-large': ['1.125rem', { lineHeight: '1.5', fontWeight: '400' }], // 18px - Body Large
        'body': ['1rem', { lineHeight: '1.5', fontWeight: '400' }],       // 16px - Body
        'body-small': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }], // 14px - Body Small
        'caption': ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }], // 12px - Caption
        
        // Technical/Code - Letter Gothic Std
        'code': ['0.875rem', { lineHeight: '1.4', fontWeight: '400' }],   // 14px - Code
        'technical': ['0.875rem', { lineHeight: '1.4', fontWeight: '400' }], // 14px - Technical
        
        // Compact/Sidebar - DIN 2014 Narrow
        'compact': ['0.875rem', { lineHeight: '1.4', fontWeight: '400' }], // 14px - Compact
        
        // Accent/Special - Termina
        'accent': ['1rem', { lineHeight: '1.4', fontWeight: '400' }],     // 16px - Accent
        
        // Legacy Support  
        'page-title': ['2.25rem', { lineHeight: '1.2', fontWeight: '700' }], // Maps to section
        'panel': ['1.5rem', { lineHeight: '1.3', fontWeight: '400' }],    // Maps to subsection
        'widget': ['1.25rem', { lineHeight: '1.3', fontWeight: '400' }],  // Maps to component
        'kpi': ['1rem', { lineHeight: '1.4', fontWeight: '400' }],        // Maps to label-header
        'label': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],  // Maps to body-small
        'tooltip': ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }], // Maps to caption
      },
      
      // Font Weight Scale - Brand Guidelines
      fontWeight: {
        'thin': '100',
        'extralight': '200', 
        'light': '300',      // Utility Pro Light
        'normal': '400',     // Utility Pro Regular
        'medium': '500',     // Interpol Sans Medium
        'semibold': '600',   // Interpol Sans SemiBold
        'bold': '700',       // Interpol Sans Bold
        'extrabold': '800',
        'black': '900',      // Interpol Sans Black
      },
      
      // Spacing System - 4px base unit
      spacing: {
        'xs': '4px',
        'sm': '8px', 
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        'unit': '4px',
      },
      
      // Box Shadow - Tactical HUD Effects
      boxShadow: {
        'tactical': '0 4px 12px rgba(0, 0, 0, 0.15)',
        'tactical-dark': '0 4px 20px rgba(0, 0, 0, 0.4)',
        'hud-glow': '0 0 10px rgba(212, 175, 55, 0.3)',
        'hud-glow-strong': '0 0 15px rgba(212, 175, 55, 0.5)',
        'none': 'none',
      },
      
      // Remove all border radius - Tactical angles only
      borderRadius: {
        'none': '0',
        DEFAULT: '0',
      },
      
      // Animation Keyframes
      keyframes: {
        'pulse-hud': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' }
        },
        'glow': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(212, 175, 55, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.6)' }
        }
      },
      
      animation: {
        'pulse-hud': 'pulse-hud 1.5s infinite',
        'glow': 'glow 2s ease-in-out infinite',
      }
    },
  },
  
  plugins: [
    // Force square corners on all elements
    function({ addUtilities }) {
      addUtilities({
        '.border-radius-none': {
          'border-radius': '0 !important',
        },
        // Force all border radius classes to be square
        '.rounded': { 'border-radius': '0 !important' },
        '.rounded-sm': { 'border-radius': '0 !important' },
        '.rounded-md': { 'border-radius': '0 !important' },
        '.rounded-lg': { 'border-radius': '0 !important' },
        '.rounded-xl': { 'border-radius': '0 !important' },
        '.rounded-2xl': { 'border-radius': '0 !important' },
        '.rounded-3xl': { 'border-radius': '0 !important' },
        '.rounded-full': { 'border-radius': '0 !important' },
      })
    }
  ],
  
  // Dark mode configuration
  darkMode: ['class', '[data-theme="dark"]'],
}