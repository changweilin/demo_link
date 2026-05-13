import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createResumeSyncMiddleware } from "./scripts/resume-sync-core.js";

const devPort = Number(process.env.VITE_DEV_PORT ?? 43177);
const devServer = {
  host: "0.0.0.0",
  port: Number.isFinite(devPort) ? devPort : 43177,
  strictPort: false,
};

export default defineConfig(() => ({
  plugins: [
    react(),
    {
      name: "local-resume-sync",
      configureServer(server) {
        server.middlewares.use(createResumeSyncMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(createResumeSyncMiddleware());
      },
    },
  ],
  base: process.env.VITE_BASE_PATH ?? "/",
  server: devServer,
  preview: devServer,
}));
