# Troubleshooting Chrome Extension Build Errors

This document outlines the process of diagnosing and fixing a common build error encountered during the development of the Gemini Prompt Extractor extension: `Uncaught SyntaxError: Cannot use import statement outside a module`.

## 1. The Problem: The Initial Error

The error message is a clear indicator that a JavaScript file using ES Module features (like `import` and `export`) was executed in an environment that doesn't support them. In our case, this happened in the `content.js` script after it was injected into a webpage.

**Why did this happen?**
Chrome Extension content scripts run in the isolated context of a webpage. While modern JavaScript is powerful, you cannot assume a standard module-loading environment exists on every page. Unless a script is explicitly loaded as a module (`<script type="module">`), it is treated as a classic script, which does not understand the `import` syntax.

## 2. Investigation and Diagnosis

The key to solving this was understanding how the different scripts in our extension are used and how the build tool (Vite) was configured to bundle them.

### Step 1: Analyze the Scripts' Roles

First, we identified three distinct types of scripts in our extension, each with different loading requirements:

1.  **Background Script (`background.ts`):** This is a Service Worker. The `manifest.json` explicitly defines it as a module (`"type": "module"`), so it **must** be bundled in the ESM format.
2.  **Side Panel Script (`sidepanel.ts`):** This script is loaded by `sidepanel.html` using `<script src="sidepanel.js" type="module"></script>`. It also **must** be bundled in the ESM format.
3.  **Content Script (`content.ts`):** This script is injected directly into web pages by the extension. As established, it **cannot** be a module and needs to be a self-contained, classic script.

### Step 2: Examine the Build Configuration

Our initial `vite.config.js` was configured to output a single format for all entry points:

```javascript
// vite.config.js (Initial, Incorrect)
// ...
      output: {
        entryFileNames: "[name].js",
        format: "esm", // This was the problem
      },
// ...
```

This configuration bundled `content.js` as an ES Module, leading directly to the error.

## 3. Attempted Solutions and Lessons Learned

### Attempt #1: Switch Everything to `iife`

The first logical step was to change the output format to `iife` (Immediately Invoked Function Expression), which creates self-contained scripts.

```javascript
// vite.config.js (Attempt 1)
// ...
      output: {
        entryFileNames: "[name].js",
        format: "iife", // Changed from "esm"
      },
// ...
```

**Result:** The build failed. Vite/Rollup threw an error because the `iife` format does not support multiple inputs (`background`, `content`, `sidepanel`) in a single build process. This taught us that a one-size-fits-all approach wouldn't work.

### Attempt #2: A Complex, Incorrect Configuration

The next idea was to try and configure multiple output formats at once. This led to a more complex but still incorrect configuration that also failed with the same error. The key lesson was that Vite's standard configuration is not designed to easily output different formats for different entry points in one go.

## 4. The Final, Successful Solution

The breakthrough came from a hybrid approach: build all scripts in the modern format and then modify the one script that needed to be different.

The final `vite.config.js` does the following:
1.  It sets the primary output format to `esm` for all entry points. This correctly bundles `background.js` and `sidepanel.js`.
2.  It adds a small, custom Rollup plugin that runs at the end of the build process.
3.  This plugin takes the generated `content.js` (which is in `esm` format at this point) and wraps its code inside an IIFE.

Here is the final, working configuration:

```javascript
// vite.config.js (Final, Correct)
import { defineConfig } from "vite";
import { resolve } from "path";
import copy from "rollup-plugin-copy";

const root = resolve(__dirname, "src");
const outDir = resolve(__dirname, "dist");

export default defineConfig({
  root,
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(root, "core", "background.ts"),
        content: resolve(root, "core", "content.ts"),
        sidepanel: resolve(root, "core", "sidepanel.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        format: "esm",
      },
      plugins: [
        copy({
          targets: [{ src: "static/*", dest: outDir }],
          hook: "writeBundle",
        }),
        // This custom plugin wraps the content script in an IIFE
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
```

This elegant solution satisfies the unique requirements of all three script types, resolving the build error and the original runtime error.

## 5. Key Concepts and Terminology

Understanding these concepts is crucial for modern web and extension development.

### JavaScript Modules (ESM)
-   **What they are:** A way to organize code into separate files (modules). Each module can `export` variables, functions, or classes, and other modules can `import` them.
-   **Why use them:** They prevent pollution of the global namespace, make dependencies clear, and allow build tools to perform "tree-shaking" (removing unused code).
-   **How they run:** The browser or Node.js must be explicitly told to treat a file as a module (e.g., `<script type="module">`).

### IIFE (Immediately Invoked Function Expression)
-   **What it is:** A JavaScript function that is defined and executed immediately. The syntax is `(function(){ /* code */ })();`.
-   **Why use it:** The primary benefit is **scope isolation**. Any variables declared inside the IIFE are not accessible from the outside (they don't become global variables). This is perfect for content scripts, as it prevents your script's variables from conflicting with the variables on the webpage it's injected into. It creates a safe, self-contained package.

### Build Tools (Vite & Rollup)
-   **What they do:** They are "bundlers." They take all your source code files (TypeScript, JavaScript, CSS, etc.), process them (e.g., compile TypeScript to JavaScript), and combine them into a few optimized files that are ready to be used in a browser.
-   **Why use them:** They manage complex dependencies, optimize code for performance, and automate the process of preparing your code for production. Vite uses Rollup under the hood for its build process.
