import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'ss-black': '#050806',
        'ss-charcoal': '#111812',
        'ss-surface': '#f4f7f2',
        'ss-card': '#ffffff',
        'ss-green': '#078b3e',
        'ss-green-deep': '#046b31',
        'ss-green-soft': '#e8f7ee',
        'ss-sky': '#16a9d8',
        'ss-orange': '#f6a11a',
        'ss-ink': '#17221b',
        'ss-muted': '#738078',
        'ss-line': '#e7ece8',
        'ss-danger': '#d92353',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      borderRadius: {
        xl: '18px',
        '2xl': '26px',
      },
    },
  },
  plugins: [],
};

export default config;
