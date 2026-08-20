/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        felt: "#100b08",
        panel: "#1b130e",
        panel2: "#241a13",
        wood: "#241610",
        woodmid: "#5a3825",
        brass: "#c9a35a",
        brassb: "#e8c887",
        ink: "#f2e8d8",
        inkdim: "#b9a98e",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        ui: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        brass: "0 0 0 1px #c9a35a66, 0 10px 30px #0008",
      },
    },
  },
  plugins: [],
};
