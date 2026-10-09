/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        page: '#4CBFB5',
        surface: {
          light: '#FFFFFF',
          dark: '#10292B',
          DEFAULT: '#FFFFFF',
        },
        ink: {
          light: '#0E3B3F',
          dark: '#E2F3F1',
          DEFAULT: '#0E3B3F',
        },
        muted: {
          light: '#4F6B6E',
          dark: '#7D9E9E',
          DEFAULT: '#4F6B6E',
        },
        line: {
          light: '#E3EEED',
          dark: '#1B4144',
          DEFAULT: '#E3EEED',
        },
        bubble: {
          received: '#C9ECE8',
          sent: '#27706F',
        },
        badge: '#E5484D',
        g1: '#0A5F66',
        g2: '#2A9D9A',
        g3: '#8ED6CF',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        'bubble': '16px',
        'bubble-tail': '4px',
      },
    },
  },
  plugins: [],
}
