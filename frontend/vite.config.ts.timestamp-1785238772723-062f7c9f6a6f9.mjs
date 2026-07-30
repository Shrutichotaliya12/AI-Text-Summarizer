// vite.config.ts
import { defineConfig } from "file:///C:/Users/pdcho/OneDrive/Desktop/frontend/self-project/4/claude/ai/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/pdcho/OneDrive/Desktop/frontend/self-project/4/claude/ai/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\pdcho\\OneDrive\\Desktop\\frontend\\self-project\\4\\claude\\ai\\frontend";
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  server: {
    port: 3e3,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router-dom")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/framer-motion")) {
            return "vendor-framer";
          }
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3")) {
            return "vendor-charts";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }
          if (id.includes("node_modules/clsx") || id.includes("node_modules/tailwind-merge") || id.includes("node_modules/class-variance-authority")) {
            return "vendor-ui-utils";
          }
          if (id.includes("node_modules/axios") || id.includes("node_modules/jose") || id.includes("node_modules/jwt")) {
            return "vendor-http";
          }
          if (id.includes("node_modules/zod") || id.includes("node_modules/react-hook-form") || id.includes("node_modules/@hookform")) {
            return "vendor-forms";
          }
          if (id.includes("node_modules/date-fns") || id.includes("node_modules/dayjs") || id.includes("node_modules/moment")) {
            return "vendor-dates";
          }
          if (id.includes("node_modules")) {
            return "vendor-misc";
          }
          if (id.includes("/presentation/pages/")) {
            return "app-pages";
          }
          if (id.includes("/presentation/layout/") || id.includes("/components/")) {
            return "app-components";
          }
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxwZGNob1xcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXGZyb250ZW5kXFxcXHNlbGYtcHJvamVjdFxcXFw0XFxcXGNsYXVkZVxcXFxhaVxcXFxmcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxccGRjaG9cXFxcT25lRHJpdmVcXFxcRGVza3RvcFxcXFxmcm9udGVuZFxcXFxzZWxmLXByb2plY3RcXFxcNFxcXFxjbGF1ZGVcXFxcYWlcXFxcZnJvbnRlbmRcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3BkY2hvL09uZURyaXZlL0Rlc2t0b3AvZnJvbnRlbmQvc2VsZi1wcm9qZWN0LzQvY2xhdWRlL2FpL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogMzAwMCxcbiAgICBob3N0OiB0cnVlLFxuICAgIHByb3h5OiB7XG4gICAgICBcIi9hcGlcIjoge1xuICAgICAgICB0YXJnZXQ6IFwiaHR0cDovL2xvY2FsaG9zdDo4MDAwXCIsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDYwMCxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzKGlkKSB7XG4gICAgICAgICAgLy8gVmVuZG9yOiBSZWFjdCBjb3JlXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL3JlYWN0XCIpIHx8IGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL3JlYWN0LWRvbVwiKSB8fCBpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy9yZWFjdC1yb3V0ZXItZG9tXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3ItcmVhY3RcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gVmVuZG9yOiBGcmFtZXIgTW90aW9uIGFuaW1hdGlvbnNcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXMvZnJhbWVyLW1vdGlvblwiKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLWZyYW1lclwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBWZW5kb3I6IENoYXJ0c1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy9yZWNoYXJ0c1wiKSB8fCBpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy9kM1wiKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLWNoYXJ0c1wiO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBWZW5kb3I6IEx1Y2lkZSBpY29uc1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy9sdWNpZGUtcmVhY3RcIikpIHtcbiAgICAgICAgICAgIHJldHVybiBcInZlbmRvci1pY29uc1wiO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBWZW5kb3I6IE1pc2MgVUkgdXRpbGl0aWVzXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL2Nsc3hcIikgfHwgaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXMvdGFpbHdpbmQtbWVyZ2VcIikgfHwgaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXMvY2xhc3MtdmFyaWFuY2UtYXV0aG9yaXR5XCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3ItdWktdXRpbHNcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gVmVuZG9yOiBIVFRQICsgQXV0aCB1dGlsc1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy9heGlvc1wiKSB8fCBpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy9qb3NlXCIpIHx8IGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL2p3dFwiKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLWh0dHBcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gVmVuZG9yOiBGb3JtIHZhbGlkYXRpb25cbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXMvem9kXCIpIHx8IGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL3JlYWN0LWhvb2stZm9ybVwiKSB8fCBpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy9AaG9va2Zvcm1cIikpIHtcbiAgICAgICAgICAgIHJldHVybiBcInZlbmRvci1mb3Jtc1wiO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBWZW5kb3I6IERhdGUgdXRpbGl0aWVzXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL2RhdGUtZm5zXCIpIHx8IGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL2RheWpzXCIpIHx8IGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL21vbWVudFwiKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLWRhdGVzXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFZlbmRvcjogQWxsIG90aGVyIG5vZGVfbW9kdWxlc1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlc1wiKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLW1pc2NcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gQXBwOiBQYWdlcyBcdTIwMTQgbGF6eS1sb2FkYWJsZSBVSSBwYWdlc1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIi9wcmVzZW50YXRpb24vcGFnZXMvXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJhcHAtcGFnZXNcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gQXBwOiBTaGFyZWQgbGF5b3V0IGFuZCBjb21wb25lbnRzXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiL3ByZXNlbnRhdGlvbi9sYXlvdXQvXCIpIHx8IGlkLmluY2x1ZGVzKFwiL2NvbXBvbmVudHMvXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJhcHAtY29tcG9uZW50c1wiO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFzYSxTQUFTLG9CQUFvQjtBQUNuYyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBRmpCLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUEsTUFDVjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCx1QkFBdUI7QUFBQSxJQUN2QixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixhQUFhLElBQUk7QUFFZixjQUFJLEdBQUcsU0FBUyxvQkFBb0IsS0FBSyxHQUFHLFNBQVMsd0JBQXdCLEtBQUssR0FBRyxTQUFTLCtCQUErQixHQUFHO0FBQzlILG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLDRCQUE0QixHQUFHO0FBQzdDLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLHVCQUF1QixLQUFLLEdBQUcsU0FBUyxpQkFBaUIsR0FBRztBQUMxRSxtQkFBTztBQUFBLFVBQ1Q7QUFFQSxjQUFJLEdBQUcsU0FBUywyQkFBMkIsR0FBRztBQUM1QyxtQkFBTztBQUFBLFVBQ1Q7QUFFQSxjQUFJLEdBQUcsU0FBUyxtQkFBbUIsS0FBSyxHQUFHLFNBQVMsNkJBQTZCLEtBQUssR0FBRyxTQUFTLHVDQUF1QyxHQUFHO0FBQzFJLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLG9CQUFvQixLQUFLLEdBQUcsU0FBUyxtQkFBbUIsS0FBSyxHQUFHLFNBQVMsa0JBQWtCLEdBQUc7QUFDNUcsbUJBQU87QUFBQSxVQUNUO0FBRUEsY0FBSSxHQUFHLFNBQVMsa0JBQWtCLEtBQUssR0FBRyxTQUFTLDhCQUE4QixLQUFLLEdBQUcsU0FBUyx3QkFBd0IsR0FBRztBQUMzSCxtQkFBTztBQUFBLFVBQ1Q7QUFFQSxjQUFJLEdBQUcsU0FBUyx1QkFBdUIsS0FBSyxHQUFHLFNBQVMsb0JBQW9CLEtBQUssR0FBRyxTQUFTLHFCQUFxQixHQUFHO0FBQ25ILG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLGNBQWMsR0FBRztBQUMvQixtQkFBTztBQUFBLFVBQ1Q7QUFFQSxjQUFJLEdBQUcsU0FBUyxzQkFBc0IsR0FBRztBQUN2QyxtQkFBTztBQUFBLFVBQ1Q7QUFFQSxjQUFJLEdBQUcsU0FBUyx1QkFBdUIsS0FBSyxHQUFHLFNBQVMsY0FBYyxHQUFHO0FBQ3ZFLG1CQUFPO0FBQUEsVUFDVDtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
