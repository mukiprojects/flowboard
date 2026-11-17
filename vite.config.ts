import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Production builds are destined for GitHub Pages (/flowboard/).
  // The dev server stays at / so localhost:5173 works normally.
  base: mode === "production" ? "/flowboard/" : "/",
  server: {
    port: 5173,
  },
}));
