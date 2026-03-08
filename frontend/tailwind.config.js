/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        rose: {
          50: '#FDF8F6',
          100: '#F9E4E4',
          200: '#F0CCCC',
          300: '#E8AAAA',
          400: '#D4A574',
          500: '#C4956A',
          600: '#B8856A',
          700: '#8B7355',
          800: '#6B5A45',
          900: '#4A3F32',
        },
        gold: {
          100: '#F5E6D3',
          200: '#EAC99A',
          300: '#D4A574',
          400: '#C4956A',
          500: '#B8856A',
          600: '#A07550',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
