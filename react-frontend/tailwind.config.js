/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Coolvetica', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Nexa', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Nexa', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#3B82F6',
          dark: '#2D65E6',
          light: '#60A5FA',
        },
        secondary: {
          DEFAULT: '#234C90',
          dark: '#1E3A8A',
          light: '#3B82F6',
        },
        background: {
          DEFAULT: '#FFFFFF',
          secondary: '#F8FAFC',
          tertiary: '#F1F5F9',
        },
        border: {
          DEFAULT: '#E2E8F0',
          light: '#F1F5F9',
        },
        text: {
          primary: '#1E293B',
          secondary: '#64748B',
          tertiary: '#94A3B8',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #3B82F6 0%, #234C90 100%)',
        'gradient-light': 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(59, 130, 246, 0.08)',
        'medium': '0 4px 16px rgba(59, 130, 246, 0.12)',
        'hard': '0 8px 32px rgba(59, 130, 246, 0.16)',
      },
    },
  },
  plugins: [],
}
