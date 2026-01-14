// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Frontend:  http://localhost:5173/api/...  -> Backend: http://localhost:3001/api/...
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },

      // Fotoğraflar / upload dosyaları
      // Frontend:  http://localhost:5173/uploads/... -> Backend: http://localhost:3001/uploads/...
      "/uploads": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
