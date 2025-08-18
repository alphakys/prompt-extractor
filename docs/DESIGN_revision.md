# **Technical Design Document: Chrome Extension - Side Panel Content Extractor (Revised)**

## 1. Overview

A Chrome Extension that extracts and displays webpage content from the **Gemini** web app in a browser side panel. Built with **TypeScript** and following **Manifest V3** guidelines, it is designed for **SPA-aware extraction**, robust error handling, and maintainability.

---

## 2. Project Stack

* **Language**: TypeScript
* **Bundler**: **Vite** (preferred for speed) or Webpack
* **Linting/Formatting**: ESLint + Prettier
* **Testing**:

  * Unit testing: Jest
  * E2E testing: Playwright for DOM extraction validation

* **Code edit guide**:

  * Tab indent: 4

**Directory Structure**

```
/dist
    background.js
    content.js
    sidepanel.js
    sidepanel.html
    sidepanel.css
    /assets
        icon16.png
        icon48.png
        icon128.png
/src
    /core
        background.ts
        content.ts
        sidepanel.ts
    /extractors
        geminiExtractor.ts
        index.ts
    /shared
        types.ts
        messages.ts  // Centralized message type registry
        config.ts    // URL patterns, selectors
/static
    sidepanel.html
    sidepanel.css
    manifest.json
    /assets
        {...}
/vite.config.js or /webpack.config.js
/tsconfig.json
/README.md
```

---

## 3. System Architecture

**Components**

1. **Content Script (`content.ts`)** – Runs in webpage context, extracts DOM data via pluggable extractors.
2. **Background Script (`background.ts`)** – Orchestrates communication, state management, and SPA detection.
3. **Side Panel (`sidepanel.ts`, `.html`, `.css`)** – Displays extracted content with reactive updates.

**SPA-Aware Flow**

* Uses `chrome.webNavigation.onHistoryStateUpdated` for URL changes.
* Delays extraction until **DOM readiness polling** confirms target elements are available.

**Architecture Diagram**

```
Toolbar Click
   ↓
Background Script ⇄ Content Script ⇄ DOM
   ↑
   ⇅
Side Panel
```

---

## 4. Data Flow

### **Standard Extraction**

1. User clicks toolbar icon.
2. Background script opens side panel.
3. Side panel requests latest content.
4. If cache empty → background requests content script extraction.
5. Content script uses extractor to parse DOM (with retry/backoff).
6. Result stored in `chrome.storage.session`.
7. UI updated with `UPDATE_VIEW` message.

### **SPA Navigation**

1. URL changes detected.
2. Background triggers new extraction after DOM readiness.
3. Same steps as above, updating both cache & UI.

---

## 5. Pluggable Extraction Design

* Extraction logic stored in `/extractors` folder.
* **Strategy Pattern**: Each extractor implements `IExtractor` interface:

```ts
interface IExtractor {
  canHandle(url: string): boolean;
  extract(): Promise<{ status: 'success', data: string } | { status: 'error', message: string }>;
}
```

* Future sites can be added without modifying `content.ts`.

---

## 6. Configurable Selectors & URL Patterns

`/shared/config.ts` contains:

```ts
export const URL_PATTERNS = ["https://gemini.google.com/app/*"];
export const SELECTORS = {
  gemini: ".chat-content",
};
```

This allows quick updates when DOM or site patterns change.

---

## 7. Robustness Features

* **Retry with exponential backoff** (max 3 attempts) if DOM not ready or extraction fails.
* **Error UI** in side panel for failed extractions.
* **Loading state** to improve UX.
* **Graceful fallback** if no extractor matches current URL.

---

## 8. Message Passing Interface (Centralized)

Located in `/shared/messages.ts`:

```ts
export const MESSAGES = {
  GET_LATEST_CONTENT: "GET_LATEST_CONTENT",
  EXTRACT_CONTENT: "EXTRACT_CONTENT",
  EXTRACTION_RESULT: "EXTRACTION_RESULT",
  UPDATE_VIEW: "UPDATE_VIEW"
} as const;
```

Payloads remain as per original design but now all message keys are in one file for maintainability.

---

## 9. Non-Functional Requirements

* **Performance**: Extraction < 500ms for standard pages.
* **Security**:

  * Strict Content Security Policy in `manifest.json`.
  * No remote script execution.
* **Testing**:

  * Jest unit tests for extractors.
  * Playwright tests for SPA navigation handling.

---

## 10. Future Enhancements

* **Incremental DOM diffing** for faster SPA updates.
* **Multiple site support** via extractor registry.
* **Developer debug panel** in side panel for real-time logging.

---
