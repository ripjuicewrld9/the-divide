/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        felt: {
          dark: '#1a472a',
          light: '#2d5a3d',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
      },
      keyframes: {
        flip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        chipslide: {
          '0%': { transform: 'translate(0, 0)' },
          '100%': { transform: 'translate(var(--tx), var(--ty))' },
        },
      },
      animation: {
        flip: 'flip 0.6s ease-in-out',
        chipslide: 'chipslide 0.6s ease-out forwards',
      },
    },
  },
  plugins: [],
};
