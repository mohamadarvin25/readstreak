/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#fc5200', light: '#ff7a3d', dark: '#c94100' },
        ink: { 900: '#0f0f10', 800: '#18181b', 700: '#232327', 600: '#2e2e33', 400: '#8a8a93' },
      },
    },
  },
  plugins: [],
}
