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
        page: 'var(--color-page)',
        surface: 'var(--color-surface)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        line: 'var(--color-line)',
        field: 'var(--color-field)',
        tide: 'var(--color-tide)',
        l1: 'var(--color-l1)',
        l2: 'var(--color-l2)',
        l3: 'var(--color-l3)',
        btn: {
          DEFAULT: 'var(--color-btn)',
          ink: 'var(--color-btn-ink)',
        },
        dis: 'var(--color-dis)',
        pill: 'var(--color-pill)',
        ok: 'var(--color-ok)',
        bad: 'var(--color-bad)',
        bubble: {
          sent: 'var(--color-bubble-sent)',
          'sent-ink': 'var(--color-bubble-sent-ink)',
          received: 'var(--color-bubble-received)',
        },
        badge: {
          DEFAULT: 'var(--color-badge)',
          ink: 'var(--color-badge-ink)',
        },
        g1: '#050505',
        g2: '#151515',
        g3: '#383838',
      },
      fontFamily: {
        display: ['Anton', 'Impact', '"Arial Narrow"', 'sans-serif'],
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
      boxShadow: {
        neumorphic: 'var(--shadow-neumorphic)',
        card: '0 22px 50px rgba(0,0,0,.35), 0 3px 8px rgba(0,0,0,.2)',
        menu: '0 8px 22px rgba(0,0,0,.25)',
      },
      borderRadius: {
        'bubble': '16px',
        'bubble-tail': '4px',
      },
    },
  },
  plugins: [],
}
