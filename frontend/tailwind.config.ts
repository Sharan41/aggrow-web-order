import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f1f8f4",
          100: "#dcefe1",
          200: "#b8dec5",
          300: "#8cc7a1",
          400: "#58a879",
          500: "#348a5d",
          600: "#266d48",
          700: "#1f573b",
          800: "#194530",
          900: "#153827",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
