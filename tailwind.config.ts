import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dae6ff",
          500: "#3b5bdb",
          600: "#2f4bb8",
          700: "#273e97",
        },
      },
    },
  },
  plugins: [],
};
export default config;
