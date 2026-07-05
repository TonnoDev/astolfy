/** @type {import('tailwindcss').Config} */
export default {
  // Files Tailwind should scan to detect utility classes in use.
  // `src` covers all components/pages, plus index.html for body-level classes.
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  // IMPORTANT: Tailwind's default `preflight` (CSS reset) conflicts with
  // Ionic's own reset and breaks native component styling (e.g. buttons
  // lose padding, ion-card borders vanish). We disable it and let Ionic's
  // reset own the base styles. Tailwind utilities still work normally.
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      // Map Ionic theme colors so you can use e.g. `text-primary`,
      // `bg-secondary` and they pick up the app palette from
      // src/theme/variables.css.
      colors: {
        primary: 'var(--ion-color-primary)',
        secondary: 'var(--ion-color-secondary)',
        tertiary: 'var(--ion-color-tertiary)',
        success: 'var(--ion-color-success)',
        warning: 'var(--ion-color-warning)',
        danger: 'var(--ion-color-danger)',
        light: 'var(--ion-color-light)',
        medium: 'var(--ion-color-medium)',
        dark: 'var(--ion-color-dark)',
      },
      fontFamily: {
        sans: 'var(--ion-font-family, inherit)',
      },
    },
  },
  plugins: [],
};