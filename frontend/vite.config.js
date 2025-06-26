import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Remove the custom define - let Vite handle environment variables naturally
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
  },
});