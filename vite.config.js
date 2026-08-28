import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In local dev, `vercel dev` serves /api on 3000. Without this the
    // recommendation calls 404 and Discover looks broken for no reason.
    proxy: { "/api": "http://localhost:3000" },
  },
});
