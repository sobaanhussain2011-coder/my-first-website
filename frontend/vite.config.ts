import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    proxy: {
      "/auth": "http://127.0.0.1:4000",
      "/games": "http://127.0.0.1:4000",
      "/users": "http://127.0.0.1:4000",
      "/health": "http://127.0.0.1:4000",
      "/socket.io": { target: "http://127.0.0.1:4000", ws: true },
    },
  },
});
