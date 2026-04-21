/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // DESIGN.md — Replicate-inspired system
        'rep-dark':   '#202020',
        'rep-red':    '#ea2804',
        'rep-red-2':  '#dd4425',
        'rep-green':  '#2b9a66',
        'rep-code':   '#24292e',
        'rep-gray':   '#646464',
        'rep-silver': '#8d8d8d',
        'rep-light':  '#bbbbbb',
      },
      fontFamily: {
        display: ['rb-freigeist-neue', 'Inter', 'ui-sans-serif', 'system-ui'],
        sans:    ['basier-square', 'Inter', 'ui-sans-serif', 'system-ui'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
