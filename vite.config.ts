import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
  ],
  root: path.resolve(__dirname, "artifacts/balebeleq-web"),
  build: {
    outDir: path.resolve(__dirname, "artifacts/balebeleq-web/dist/public"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "artifacts/balebeleq-web/src"),
      "@assets": path.resolve(__dirname, "attached_assets"),
      "@workspace/api-client-react": path.resolve(__dirname, "lib/api-client-react/src/index.ts"),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 3000,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
