import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Vite config: React + Tailwind CSS v4 (no tailwind.config.js needed —
// design tokens live in src/index.css inside the @theme block).
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
