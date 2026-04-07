/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: '#FF5733', // Màu cam tươi, chính xác như ảnh gốc
      },
    },
  },
  plugins: [],
}