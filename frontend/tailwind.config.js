/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        felt: "#07060c",
        panel: "#0e0c14",
        panel2: "#16131f",
        wood: "#0a0810",
        woodmid: "#3a2a18",
        brass: "#e0b257",
        brassb: "#f6d98a",
        ink: "#f7f1e4",
        inkdim: "#9a8fb0",
      },
      fontFamily: {
        display: ["Cinzel", "Georgia", "serif"],
        ui: ["Outfit", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        brass: "0 0 0 1px #e0b25755, 0 20px 60px #000a, 0 0 40px #e0b25722",
      },
    },
  },
  plugins: [],
};
