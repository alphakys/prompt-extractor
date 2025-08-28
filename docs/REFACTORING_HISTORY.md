# Refactoring History

This document tracks the refactoring changes made to the Gemini Prompt Extractor codebase.

---

# User Improvement Requirement Phase 1

-   The message key `GET_LATEST_CONTENT` is awkward and should be renamed for clarity.
-   The content script injection logic in `background.ts` is split between `injectContentScript` and `ensureContentInjected`, which can be consolidated.
-   Clarify the necessity of `try...catch` in the injection logic.

# Refactoring Plan (Phase 1)

1.  **Rename `GET_LATEST_CONTENT` Message:**
    *   As requested, the message key `GET_LATEST_CONTENT` was renamed to `REQUEST_CONTENT` for better clarity and conciseness.
    *   This change was applied consistently across `src/shared/messages.ts`, `src/core/background.ts`, and `src/core/sidepanel.ts`.

2.  **Consolidate Content Script Injection Logic:**
    *   Merged the `injectContentScript` and `ensureContentInjected` functions in `background.ts` into a single, more readable function named `ensureContentScriptInjected`.
    *   This new function first attempts to communicate with the content script via a `PING` message. If that fails, it proceeds to inject the script and then verifies its readiness, streamlining the logic and removing redundancy.

3.  **Clarify Error Handling:**
    *   The `try...catch` block in the injection function was retained and explained. It is essential because `chrome.scripting.executeScript` can fail for several reasons, such as attempting to inject into a protected page (e.g., `chrome://...`), an invalid tab ID, or if the extension lacks host permissions for the target URL. The `try...catch` ensures these errors are handled gracefully without crashing the extension.

---

# Proactive Improvement Phase 2

-   The `renderPrompt` function in `src/core/sidepanel.ts` was doing too much: managing the list, creating cards, and handling UI events. This violates the Single Responsibility Principle and makes the code harder to maintain.

# Refactoring Plan (Phase 2)

1.  **Isolate Card Creation**:
    *   A new function, `createPromptCard`, was created. It takes a single prompt array and its index as arguments.
    *   This function is solely responsible for building and returning a complete HTML card element for that prompt, including its header, content paragraphs, and the "More/Less" toggle button with its event listener.

2.  **Simplify `renderPrompt`**:
    *   The main `renderPrompt` function was simplified to manage the overall list.
    *   Its responsibilities are now limited to clearing the existing content, displaying a "No prompts found" message if necessary, and looping through the prompt data to call `createPromptCard` for each item, appending the result to the list.

---

# User Improvement Requirement Phase 3

-   The retry logic was duplicated and excessive. The background script had a retry loop for sending messages (`triggerExtraction`), and the content script had a separate retry loop for finding the DOM elements (`extractWithRetry`). This was considered over-engineering.
-   A discussion was raised about moving the caching and message-routing logic from the `onMessage` listener into the `triggerExtraction` function.

# Refactoring Plan & Design Discussion (Phase 3)

1.  **Simplify Retry Strategy**:
    *   The retry loop in `background.ts`'s `triggerExtraction` function was removed.
    *   The function's single responsibility is now to send the `EXTRACT_CONTENT` message once.
    *   The retry logic in `content.ts`'s `extractWithRetry` was kept, as its responsibility is to wait for the SPA's DOM to be ready, which is a necessary and distinct concern.
    *   This change assigns a clear, single responsibility to each script's retry mechanism: the background script ensures the content script is *reachable*, and the content script ensures the DOM is *ready*.

2.  **Discussion on Single Responsibility Principle (SRP)**:
    *   **Topic**: We discussed moving the caching and routing logic from the `onMessage` listener into the `triggerExtraction` function.
    *   **Conclusion**: We agreed to **reject** this change in favor of upholding the **Single Responsibility Principle**.
    *   **Reasoning**:
        *   The `onMessage` listener's role is to be a **controller/router**. It directs incoming messages to the appropriate logic (e.g., check cache, trigger extraction). This is its single, clear purpose.
        *   The `triggerExtraction` function's role is simply to **initiate the extraction**.
        *   Combining these responsibilities would make `triggerExtraction` a complex, multi-purpose function, making the code harder to read, test, and maintain. Keeping them separate makes the architecture cleaner and more robust.
---

# Performance Optimization Phase 4

- The extension experienced noticeable slowdowns, particularly on complex Gemini pages. A deep analysis was required to identify and resolve performance bottlenecks.

# Refactoring and Optimization Plan (Phase 4)

1.  **Replace `MutationObserver` with `requestAnimationFrame` Polling:**
    *   **Problem**: The `MutationObserver` in `content.ts` was configured to watch the entire `document.body` subtree, causing significant performance overhead on dynamic pages.
    *   **Solution**: Replaced the observer with a more efficient `requestAnimationFrame`-based polling mechanism. This new approach repeatedly checks for the existence of the target prompt container without the heavy overhead of observing all DOM mutations, resolving the primary bottleneck.

2.  **Separate Data Extraction from DOM Manipulation:**
    *   **Problem**: The `GeminiExtractor` was responsible for both extracting prompt data and injecting `data-gemini-prompt-id` attributes into the DOM. This violated the Single Responsibility Principle and mixed read/write operations inefficiently.
    *   **Solution**: The `extract` method in `geminiExtractor.ts` was refactored to only handle data extraction. All DOM tagging logic was moved into `content.ts`.

3.  **Centralize DOM Tagging Logic:**
    *   **Problem**: DOM tagging was happening in multiple places, leading to potential inconsistencies.
    *   **Solution**: A new `tagDom` function was created in `content.ts` to handle the injection of `data-gemini-prompt-id` attributes. This function is now the single source of truth for DOM manipulation and is called both after a fresh extraction and when validating from the cache.

4.  **Debounce `onHistoryStateUpdated` Listener:**
    *   **Problem**: In Single-Page Applications like Gemini, the `onHistoryStateUpdated` event can fire rapidly during navigation, triggering numerous and unnecessary content extractions.
    *   **Solution**: Applied a 500ms debounce to the event listener in `background.ts`. This ensures that the extraction logic is only called once the user has settled on a new page state, significantly reducing redundant processing.
