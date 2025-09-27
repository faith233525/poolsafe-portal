import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  // Use relative paths so the app can be hosted in a subfolder (e.g., HostPapa)
  // without breaking asset URLs. If you host at the domain root, this still works.
  base: "./",
  plugins: [
    react(),
    visualizer({
      filename: "stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Performance optimizations
    target: "esnext",
    minify: "esbuild",
    cssCodeSplit: true,
    sourcemap: false,

    rollupOptions: {
      output: {
        // Code splitting configuration
        manualChunks: {
          // Vendor libraries
          vendor: ["react", "react-dom"],

          // UI components
          ui: ["react-toastify"],

          // Utilities
          utils: [
            "./src/utils/pwa.ts",
            "./src/utils/accessibility.ts",
            "./src/utils/performance.ts",
          ],
        },

        // Optimize chunk names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split("/").pop()?.replace(".tsx", "").replace(".ts", "")
            : "unknown";
          return `chunks/${facadeModuleId}-[hash].js`;
        },

        // Optimize asset names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split(".") || [];
          const extType = info[info.length - 1];

          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType || "")) {
            return `assets/images/[name]-[hash][extname]`;
          }

          if (/css/i.test(extType || "")) {
            return `assets/css/[name]-[hash][extname]`;
          }

          return `assets/[name]-[hash][extname]`;
        },
      },
    },

    // Compression and optimization
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
  },

  // Performance optimization settings
  optimizeDeps: {
    include: ["react", "react-dom", "react-toastify"],
    esbuildOptions: {
      target: "esnext",
    },
  },

  // Asset optimization
  assetsInclude: ["**/*.svg", "**/*.png", "**/*.jpg", "**/*.gif"],

  // CSS optimization
  css: {
    devSourcemap: false,
    preprocessorOptions: {
      // Using 'css' here is not a valid Vite preprocessor option key; keeping object empty for now.
    },
  },
});
