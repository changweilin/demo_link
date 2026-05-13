import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createResumePlatformAuthMiddleware } from "./scripts/resume-platform-auth.js";
import { createResumeSyncMiddleware } from "./scripts/resume-sync-core.js";

function mergeServerEnv(mode: string) {
  const env = loadEnv(mode, process.cwd(), ["VITE_", "RESUME_AUTH_", "RESUME_SYNC_"]);

  Object.entries(env).forEach(([key, value]) => {
    process.env[key] ??= value;
  });

  return env;
}

export default defineConfig(({ mode }) => {
  const env = mergeServerEnv(mode);
  const devPort = Number(env.VITE_DEV_PORT ?? process.env.VITE_DEV_PORT ?? 43177);
  const devServer = {
    host: "0.0.0.0",
    port: Number.isFinite(devPort) ? devPort : 43177,
    strictPort: false,
  };

  return {
    plugins: [
      react(),
      {
        name: "local-resume-platform-auth",
        configureServer(server) {
          server.middlewares.use(createResumePlatformAuthMiddleware());
        },
        configurePreviewServer(server) {
          server.middlewares.use(createResumePlatformAuthMiddleware());
        },
      },
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
    base: env.VITE_BASE_PATH ?? process.env.VITE_BASE_PATH ?? "/",
    server: devServer,
    preview: devServer,
  };
});
