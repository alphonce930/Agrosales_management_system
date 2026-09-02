/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: '#d4a72c',
          deep: '#0f3d2e',
          green: '#1d6f42',
          light: '#f3f6f1'
        }
      },
      boxShadow: {
        soft: '0 10px 35px rgba(15, 61, 46, 0.08)'
      }
    }
  },
  plugins: []
};
