# PromptVault (Gemini/OpenAI Prompt Extractor)

PromptVault is a Chrome extension that extracts prompts from Gemini (gemini.google.com) and ChatGPT (chatgpt.com) conversations, shows them in a side panel, and lets you copy or jump-focus to the original message on the page. It uses a background service worker orchestrating a content script and a side panel UI, with light caching to avoid redundant work.

## Features
- Extracts prompt blocks from Gemini and ChatGPT pages
- Side Panel UI with copy, expand/collapse, and focus-on-page actions
- Smart cache validation on SPA navigation to prevent stale data
- Robust content script injection with ping/inject retry
- Unit tests (Vitest + happy-dom) and e2e tests (Playwright)

## Project Layout
- `static/` – Extension assets: `manifest.json`, `sidepanel.html`, `sidepanel.css`
- `src/core/` – Extension runtime: `background.ts`, `content.ts`, `sidepanel.ts`
- `src/extractors/` – Site-specific extractors and their tests
- `src/shared/` – Shared config, types, storage, and message constants
- `vite*.config*` – Build configs for service worker/content/side panel
- `playwright/` – E2E tests and config
- `docs/` – Design notes, PRD, troubleshooting, and analysis templates

## Prerequisites
- Node.js 18+ and npm
- Chrome or Chromium-based browser that supports Manifest V3 Side Panel

## Install & Build
1. Install dependencies:
   - `npm install`
2. Build the extension (outputs to `dist/`):
   - `npm run build`

This runs two Vite builds via `vite.config.js` and `vite.content.config.js`, producing:
- `dist/background.js` (service worker)
- `dist/content.js` (content script)
- `dist/sidepanel.html`, `dist/sidepanel.css`, `dist/sidepanel.js` (side panel)
- Static assets copied from `static/`

## Load the Extension in Chrome
1. Open `chrome://extensions`
2. Enable “Developer mode”
3. Click “Load unpacked” and select the project’s `dist/` directory
4. Pin the extension if desired

The manifest (`static/manifest.json`) registers permissions for:
- `https://gemini.google.com/*`
- `https://chatgpt.com/c/*`

Ensure you test on supported paths (Gemini app and ChatGPT conversation URLs).

## Usage
- Navigate to a supported page (Gemini or ChatGPT conversation)
- Click the extension toolbar icon to open the Side Panel
- The panel will request content from the active tab, render prompt cards, and cache results
- Use “Copy” to copy prompt text, “View More/Less” to expand, and “Move” to focus the original message on the page

## Development
- Start by making changes in `src/` and `static/`
- Build after changes: `npm run build`
- Reload the unpacked extension in `chrome://extensions` to pick up new artifacts

Key files:
- `src/core/background.ts` – Orchestrates requests, cache, SPA navigation, and message routing
- `src/core/content.ts` – Detects platform, extracts content via extractors, tags DOM, validates cache
- `src/core/sidepanel.ts` – Renders cards and wires actions (copy, expand, move)
- `src/extractors/promptExtractors.ts` – `GeminiExtractor`, `ChatGPTExtractor`
- `src/shared/storage.ts` – `getCachedContent`, `setCachedContent` using `chrome.storage`
- `src/shared/messages.ts` – Message types and constants (e.g., `REQUEST_CONTENT`, `EXTRACTION_RESULT`)

## Testing
- Unit tests:
  - `npm test` (Vitest)
- End-to-end tests:
  - `npm run test:e2e` (Playwright)

Note: Running Playwright may require installed browsers (`npx playwright install`). In CI or restricted environments, adjust accordingly.

## Troubleshooting
- See `docs/BUILD_TROUBLESHOOTING.md` for common build and bundling issues
- If the side panel shows no data:
  - Verify you’re on a supported URL path
  - Open DevTools for “Service Worker” and the inspected page to check logs
  - Click the toolbar icon again to open the side panel for the active tab
  - Ensure `content.js` is injected (background logs will show ping/injection)

## Roadmap (Short)
- Add more platform extractors
- Improve heuristics for DOM selection and stability
- Optional export to local file or cloud store

## License
ISC. See `package.json` for details.

