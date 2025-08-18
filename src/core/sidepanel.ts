// src/ts/sidepanel.ts
import { MESSAGES, MessagePayloads } from "../shared/messages";

// Assume sidepanel.html has:
// <div id="loading" aria-live="polite">Loading...</div>
// <div id="error" aria-live="assertive" hidden></div>
// <div id="content" role="region" aria-label="Extracted Content"></div>

// On load, request content
document.addEventListener("DOMContentLoaded", async () => {
    const tab = await chrome.tabs.getCurrent();
    if (tab?.id) {
        showLoading(true);
        chrome.runtime.sendMessage({
            type: MESSAGES.GET_LATEST_CONTENT,
            payload: { tabId: tab.id },
        } as {
            type: typeof MESSAGES.GET_LATEST_CONTENT;
            payload: MessagePayloads[typeof MESSAGES.GET_LATEST_CONTENT];
        });
    }
});

// Message listener for updates
chrome.runtime.onMessage.addListener(
    (message: { type: keyof MessagePayloads; payload: any }) => {
        if (message.type === MESSAGES.UPDATE_VIEW) {
            showLoading(false);
            const contentElem = document.getElementById("content");
            const errorElem = document.getElementById("error");
            if (contentElem && errorElem) {
                if (message.payload.content) {
                    contentElem.textContent = message.payload.content; // Or more structured rendering
                    errorElem.hidden = true;
                } else {
                    errorElem.textContent =
                        chrome.i18n.getMessage("extractionFailed") ||
                        "Extraction failed"; // i18n support
                    errorElem.hidden = false;
                }
            }
        }
    }
);

// Helper for loading state
function showLoading(isLoading: boolean) {
    const loadingElem = document.getElementById("loading");
    if (loadingElem) {
        loadingElem.hidden = !isLoading;
    }
}
