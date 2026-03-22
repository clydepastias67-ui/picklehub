/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        green: {
          primary: '#639922',
          light: '#97C459',
          dark: '#3B6D11',
          darker: '#27500A',
        },
        dark: {
          900: '#0f0f0f',
          800: '#161616',
          700: '#1a1a1a',
          600: '#222222',
          500: '#2a2a2a',
        },
      },
      fontFamily: {
        condensed: ['Barlow Condensed', 'sans-serif'],
        body: ['Barlow', 'sans-serif'],
      },
      screens: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
};
