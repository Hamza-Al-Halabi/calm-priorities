import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Desktop (.exe) build: output goes to ../desktop/dist with STABLE file
// names (no content hashes), so desktop/launcher.js can embed each file
// into the compiled executable with a fixed import path.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../desktop/dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/app.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/app[extname]",
      },
    },
  },
});
