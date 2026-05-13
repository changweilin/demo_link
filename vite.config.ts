import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const devPort = Number(process.env.VITE_DEV_PORT ?? 5173);
const devServer = {
  host: "0.0.0.0",
  port: Number.isFinite(devPort) ? devPort : 5173,
  strictPort: false,
};

export default defineConfig(() => ({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? "/",
  server: devServer,
  preview: devServer,
}));
