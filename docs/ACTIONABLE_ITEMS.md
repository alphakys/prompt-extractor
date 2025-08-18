
## **Structured Implementation Plan**

### **Phase 1 – Project Setup & Foundations**

1. **Initialize Repository**

   * Create Git repo, set up `.gitignore` for Node, dist files.
2. **Install Tooling**

   * Install TypeScript, ESLint, Prettier.
   * Choose and set up bundler (Vite preferred).
3. **Base File Structure**

   * Create `/src/ts`, `/shared`, `/static`, `/extractors` as per TDD.
4. **Manifest V3 Setup**

   * Define `background.service_worker`, `content_scripts`, and `side_panel` entries.

### **Phase 2 – Core Messaging Backbone**

5. **Shared Message Registry**

   * Implement `/shared/messages.ts` constants.
6. **Basic Background Script**

   * Listen for toolbar clicks.
   * Send `GET_LATEST_CONTENT` and `EXTRACT_CONTENT` messages.
7. **Minimal Content Script**

   * Listen for `EXTRACT_CONTENT` and respond with dummy data.
8. **Side Panel Bootstrapping**

   * Load static HTML/CSS.
   * On open, send `GET_LATEST_CONTENT` to background.

### **Phase 3 – SPA Navigation & State Handling**

9. **SPA Detection**

   * Use `chrome.webNavigation.onHistoryStateUpdated`.
10. **State Caching**

    * Implement `chrome.storage.session` caching keyed by tabId.

---

### **Phase 4 – DOM Extraction Pipeline**

11. **Pluggable Extractor Interface**

    * Implement `IExtractor` interface in `/extractors/index.ts`.
12. **Gemini Extractor**

    * Target `.chat-content` selector from `/shared/config.ts`.
13. **DOM Readiness Polling**

    * Poll until selector exists or timeout before extraction.
14. **Retry/Backoff Mechanism**

    * Exponential backoff for failed attempts.

---

### **Phase 5 – Robust UX**

15. **Side Panel UI States**

    * Add `loading`, `error`, and `success` display states.
16. **Error Handling**

    * If extraction fails, show user-friendly message.
17. **Graceful Fallback**

    * Handle unknown URLs without crashing.

---

### **Phase 6 – Testing**

18. **Unit Tests**

    * Jest tests for extractor logic & message handling.
19. **E2E Tests**

    * Playwright tests simulating SPA navigation and content extraction.
20. **Performance Tests**

    * Measure extraction under <500ms target.

---

### **Phase 7 – Security & Hardening**

21. **CSP Rules**

    * Set strict Content Security Policy in manifest.
22. **Code Review**

    * Linting + formatting checks in CI.

---

### **Phase 8 – Future Scalability**

23. **Multiple Extractor Support**

    * Add registry to manage multiple site extractors.
24. **Developer Debug Panel**

    * Add toggle in side panel for debug logs.

| Priority | Task                                                             | Dependencies             | Parallelizable? |
| -------- | ---------------------------------------------------------------- | ------------------------ | --------------- |
| 1        | **Phase 1: Setup & Foundations**                                 | None                     | Yes             |
| 1        | Initialize repo, install tooling, set up bundler (Vite)          | None                     | Yes             |
| 1        | Create base folder structure & Manifest V3 skeleton              | None                     | Yes             |
| 1        | **Set up TypeScript configuration (`tsconfig.json`)**            | None                     | Yes             |
| 1        | **Set up Vite configuration (`vite.config.js`)**                 | None                     | Yes             |
| 1        | **Integrate manifest.json & asset copy into build process**      | None                     | Yes             |
| 2        | **Phase 2: Core Messaging Backbone**                             | Phase 1                  | Partially       |
| 2        | Implement `/shared/messages.ts` registry                         | Phase 1                  | Yes             |
| 2        | Create background script w/ toolbar click handling               | Messages registry        | Yes             |
| 2        | Minimal content script returning dummy data                      | Messages registry        | Yes             |
| 2        | Side panel HTML/CSS/JS bootstrap                                 | Phase 1                  | Yes             |
| 3        | **Phase 3: SPA Navigation & State Handling**                     | Phase 2                  | Partially       |
| 3        | Implement `chrome.webNavigation.onHistoryStateUpdated` detection | Background script        | Yes             |
| 3        | Add `chrome.storage.session` caching keyed by tabId              | Background script        | Yes             |
| 4        | **Phase 4: DOM Extraction Pipeline**                             | Phase 3                  | No              |
| 4        | Implement `IExtractor` interface & registry                      | None                     | Yes             |
| 4        | Create Gemini extractor w/ `.chat-content` selector              | Extractor interface      | No              |
| 4        | Add DOM readiness polling before extraction                      | Extractor logic          | No              |
| 4        | Add retry/backoff mechanism                                      | DOM readiness polling    | No              |
| 5        | **Phase 5: Robust UX**                                           | Phase 4                  | Yes             |
| 5        | Implement loading, error, success UI states                      | Side panel + background  | Yes             |
| 5        | Show error UI for failed extraction                              | Extraction logic         | Yes             |
| 5        | Graceful fallback for unknown URLs                               | Background script        | Yes             |
| 6        | **Phase 6: Testing**                                             | Phase 5                  | Partially       |
| 6        | Jest unit tests for extractors & messaging                       | Core logic               | Yes             |
| 6        | Playwright E2E tests for SPA navigation                          | SPA handling + extractor | No              |
| 6        | Performance tests (<500ms target)                                | Extraction pipeline      | No              |
| 7        | **Phase 7: Security & Hardening**                                | Phase 6                  | Yes             |
| 7        | Add CSP to manifest & disable remote script execution            | Manifest config          | Yes             |
| 7        | Linting + formatting checks in CI                                | ESLint/Prettier config   | Yes             |
| 8        | **Phase 8: Future Scalability**                                  | Stable v1                | Yes             |
| 8        | Add support for multiple extractors                              | Extractor registry       | Yes             |
| 8        | Developer debug panel in side panel                              | Side panel UI            | Yes             |
