import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  // Use absolute base so deep links (like /reset-password/:token) can load assets correctly.
  // Relative base breaks when opening routes directly from email.
  base: '/',
  plugins: [react()],
  server: {
    host: true,       // ← allows phone/other devices to connect
    port: 5173,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
