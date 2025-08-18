// vite.config.js
import { defineConfig } from "vite";
import { resolve } from "path";
import copy from "rollup-plugin-copy";

// The path to the root of the project.
const root = resolve(__dirname, "src");
// The path to the output directory.
const outDir = resolve(__dirname, "dist");

export default defineConfig({
  // The root directory of the source code.
  root,
  build: {
    // The output directory for the build.
    outDir,
    // Empty the output directory before building.
    emptyOutDir: true,
    // Rollup options for the build.
    rollupOptions: {
      // Define the entry points for the extension.
      input: {
        background: resolve(root, "core", "background.ts"),
        content: resolve(root, "core", "content.ts"),
        sidepanel: resolve(root, "core", "sidepanel.ts"),
      },
      // Define the output format and file names.
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background' || chunk.name === 'sidepanel') {
            return '[name].js';
          }
          return 'content.js';
        },
        chunkFileNames: `chunks/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        format: 'esm',
      },
      // Add the copy plugin to copy static files to the output directory.
      plugins: [
        copy({
          targets: [
            {
              src: "static/*",
              dest: outDir,
            },
          ],
          hook: "writeBundle", // Run the copy after the bundle is written.
        }),
        {
            name: 'iife-converter',
            generateBundle(options, bundle) {
                const contentChunk = bundle['content.js'];
                if (contentChunk && contentChunk.type === 'chunk') {
                    contentChunk.code = `(function(){${contentChunk.code}})();`;
                }
            }
        }
      ],
    },
  },
});