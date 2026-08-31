/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  // Prefijo `tw-` para no colisionar con las clases de negocio (`.button`,
  // `.card`, `.badge`, etc.) definidas en `src/styles/abstracts/_patterns.scss`.
  prefix: 'tw-',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#FF6000', dark: '#E05300', light: '#FFE4D1' },
        secondary: '#1E232A',
        info: { DEFAULT: '#0284C7', light: '#E0F2FE' },
        success: { DEFAULT: '#10B981', light: '#D1FAE5' },
        warning: { DEFAULT: '#F59E0B', light: '#FEF3C7' },
        danger: { DEFAULT: '#EF4444', light: '#FEE2E2' },
        purple: { DEFAULT: '#8B5CF6', light: '#EDE9FE' },
      },
    },
  },
  corePlugins: {
    // Angular ya trae un reset propio en `styles.scss`; evitamos que el
    // preflight de Tailwind pise los estilos base de formularios/tablas.
    preflight: false,
  },
  plugins: [],
};
