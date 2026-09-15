/** @type {import('tailwindcss').Config} */
export default {
  // Note: dark-mode matching is actually driven by the `@custom-variant dark
  // (&:is(.dark *));` declaration in src/index.css (Tailwind v4 CSS-first
  // config). This `darkMode` key is likely inert but left here for parity
  // with the JS-config convention in case a future plugin reads it.
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
