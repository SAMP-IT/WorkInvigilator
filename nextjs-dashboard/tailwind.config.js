/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Executive Slate Color System
        bg: '#0B0F14',
        surface: '#11161C',
        raised: '#141B22',
        line: '#1F2730',

        // Text Hierarchy
        ink: {
          hi: '#E7EDF3',
          mid: '#AAB4BF',
          muted: '#7A8794',
        },

        // Brand & Status Colors
        primary: '#3B82F6',
        info: '#6366F1',
        success: '#10B981',
        warn: '#F59E0B',
        danger: '#EF4444',

        // Light Mode Variants
        'bg-light': '#F7F8FA',
        'surface-light': '#FFFFFF',
        'line-light': '#E6E8EB',
        'ink-light': {
          hi: '#0B0F14',
          mid: '#374151',
          muted: '#6B7280',
        },
      },

      fontFamily: {
        ui: ['Public Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        sans: ['Public Sans', 'system-ui', 'sans-serif'], // Fallback for existing components
      },

      fontSize: {
        // Tuned for dark dashboard density with Executive Slate typography
        xs: ['0.75rem', { lineHeight: '1.1rem', letterSpacing: '0.01em' }],
        sm: ['0.875rem', { lineHeight: '1.3rem' }],
        base: ['1rem', { lineHeight: '1.45rem' }],
        lg: ['1.125rem', { lineHeight: '1.55rem', letterSpacing: '-0.005em' }],
        xl: ['1.25rem', { lineHeight: '1.6rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.5rem', { lineHeight: '1.8rem', letterSpacing: '-0.012em' }],
        '3xl': ['1.875rem', { lineHeight: '2.1rem', letterSpacing: '-0.015em' }],
        '4xl': ['2rem', { lineHeight: '2.5rem' }],
        '5xl': ['2.5rem', { lineHeight: '1' }],
        '6xl': ['3.5rem', { lineHeight: '1' }],
      },

      lineHeight: {
        'compact': '1.25', // 14/20 equivalent
        'comfortable': '1.5', // 16/24 equivalent
      },

      letterSpacing: {
        tightish: '-0.012em',
        caps: '.08em',
      },

      borderColor: {
        line: '#1F2730',
        'line-light': '#E6E8EB',
      },

      borderRadius: {
        'md': '12px',
        'lg': '16px',
      },

      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
      },

      boxShadow: {
        'card': '0 1px 1px rgba(0,0,0,.04), 0 10px 30px rgba(0,0,0,.18)',
        'hover': '0 2px 6px rgba(0,0,0,.08), 0 16px 40px rgba(0,0,0,.22)',
        'focus': '0 0 0 2px #60A5FA',
      },

      animation: {
        'count-up': 'countUp 0.8s ease-out',
        'ripple': 'ripple 0.3s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },

      keyframes: {
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        ripple: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(1.1)', opacity: '0.8' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(-1px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },

      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
    },
  },
  plugins: [
    // Focus styles plugin
    function({ addUtilities }) {
      const newUtilities = {
        '.focus-ring': {
          outline: '2px solid #60A5FA',
          'outline-offset': '2px',
        },
        '.focus-ring-inset': {
          outline: '2px solid #60A5FA',
          'outline-offset': '-2px',
        },
        '.density-compact': {
          'line-height': '1.25',
        },
        '.density-comfortable': {
          'line-height': '1.5',
        },
      }
      addUtilities(newUtilities)
    }
  ],
}