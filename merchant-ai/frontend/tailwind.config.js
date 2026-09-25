/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paytm: { navy: "#002970", blue: "#00B9F1" },
      },
    },
  },
  plugins: [],
};