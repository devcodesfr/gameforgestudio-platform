import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// helper so we don't repeat import.meta.dirname everywhere
const r = (...segments: string[]) => path.resolve(import.meta.dirname, ...segments);

export default defineConfig(async () => {
  const plugins = [
    react(),
    runtimeErrorOverlay(),
  ];

  // Replit dev-only plugins (kept from your original config)
  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    const { cartographer } = await import("@replit/vite-plugin-cartographer");
    const { devBanner } = await import("@replit/vite-plugin-dev-banner");
    plugins.push(cartographer(), devBanner());
  }

  return {
    plugins,

    // serve the React app from client/
    root: r("client"),

    resolve: {
      alias: {
        "@": r("client", "src"),
        "@shared": r("shared"),             
        "@assets": r("attached_assets"),
      },
    },

    build: {
      outDir: r("dist/public"),
      emptyOutDir: true,
    },

    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: "http://localhost:5000",   // backend
          changeOrigin: true,
        },
      },
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
