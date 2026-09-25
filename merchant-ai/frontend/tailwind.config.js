/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paytm: { navy: "#002E6E", blue: "#00B9F1" },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Plus Jakarta Sans"', "Inter", "sans-serif"],
      },
      boxShadow: {
        brutal: "6px 6px 0 #000",
        "brutal-sm": "4px 4px 0 #000",
        "brutal-lg": "8px 8px 0 #000",
      },
    },
  },
  plugins: [],
};