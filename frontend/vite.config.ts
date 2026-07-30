import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:8001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor: React core
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router-dom")) {
            return "vendor-react";
          }
          // Vendor: Framer Motion animations
          if (id.includes("node_modules/framer-motion")) {
            return "vendor-framer";
          }
          // Vendor: Charts
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3")) {
            return "vendor-charts";
          }
          // Vendor: Lucide icons
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }
          // Vendor: Misc UI utilities
          if (id.includes("node_modules/clsx") || id.includes("node_modules/tailwind-merge") || id.includes("node_modules/class-variance-authority")) {
            return "vendor-ui-utils";
          }
          // Vendor: HTTP + Auth utils
          if (id.includes("node_modules/axios") || id.includes("node_modules/jose") || id.includes("node_modules/jwt")) {
            return "vendor-http";
          }
          // Vendor: Form validation
          if (id.includes("node_modules/zod") || id.includes("node_modules/react-hook-form") || id.includes("node_modules/@hookform")) {
            return "vendor-forms";
          }
          // Vendor: Date utilities
          if (id.includes("node_modules/date-fns") || id.includes("node_modules/dayjs") || id.includes("node_modules/moment")) {
            return "vendor-dates";
          }
          // Vendor: All other node_modules
          if (id.includes("node_modules")) {
            return "vendor-misc";
          }
          // App: Pages — lazy-loadable UI pages
          if (id.includes("/presentation/pages/")) {
            return "app-pages";
          }
          // App: Shared layout and components
          if (id.includes("/presentation/layout/") || id.includes("/components/")) {
            return "app-components";
          }
        },
      },
    },
  },
});
