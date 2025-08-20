import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      input: {
        content: resolve(__dirname, "src", "core", "content.ts"),
      },
      output: {
        format: "iife",
        name: "contentScript",
        entryFileNames: "content.js",
        inlineDynamicImports: true,
      }
    }
  }
});