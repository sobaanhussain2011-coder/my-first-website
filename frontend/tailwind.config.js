/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        felt: "#f3eee4",
        panel: "#fffaf1",
        panel2: "#efe6d6",
        wood: "#1a1410",
        woodmid: "#3d2a18",
        brass: "#9a7420",
        brassb: "#c4a056",
        ink: "#1a1410",
        inkdim: "#6b5d4d",
      },
      fontFamily: {
        display: ["Cormorant Garamond", "Georgia", "serif"],
        ui: ["Outfit", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
