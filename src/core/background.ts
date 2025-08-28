// src/ts/background.ts (Updated with delay and retries to resolve timing issue)
import { MESSAGES, MessagePayloads } from "../shared/messages";
import { config } from "../shared/config";
import { geminiUrlFilterRule, geminiNavigationFilter } from "../shared/utils";
import { getCachedContent, setCachedContent } from "../shared/storage";
// Type aliases for clarity (assume from types.ts)
type ExtractionResult = MessagePayloads[typeof MESSAGES.EXTRACTION_RESULT];
const TRIGGER_MAX_RETRIES = 3;
let isSidepanelOpened = false;

chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel
        .setPanelBehavior({ openPanelOnActionClick: false })
        .catch((error) => {
            console.error("<onInstalled> something wrong: ", error);
        });

    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
        chrome.declarativeContent.onPageChanged.addRules([geminiUrlFilterRule]);
    });
});

// Listen for toolbar click to open side panel
chrome.action.onClicked.addListener(async (tab) => {
    // This site url trigger onClicked event means
    // that current url can open side panel
    if (tab.id && tab.url) {
        await chrome.sidePanel.open({ tabId: tab.id });
    }
});

// Debounce function for throttling extractions
function debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            func(...args);
            timeout = null;
        }, delay);
    };
}

// Message listener for orchestration
chrome.runtime.onMessage.addListener(
    (
        message: { type: keyof MessagePayloads; payload: any },
        sender,
        sendResponse
    ) => {
        (async () => {
            if (message.type === MESSAGES.REQUEST_CONTENT) {
                const { tabId, url } = message.payload;

                const isReady = await ensureContentScriptInjected(tabId);
                if (!isReady) {
                    // Handle cases where injection fails
                    sendResponse({
                        type: MESSAGES.UPDATE_VIEW,
                        payload: {
                            content: {
                                status: "error",
                                message: "Could not connect to the page.",
                            },
                        },
                    });
                    return;
                }

                const cached = await getCachedContent(url);

                if (cached) {
                    console.log("Cache is hit. Validating DOM tags...", cached);
                    // Cache exists, but we need to ensure the DOM is tagged.
                    const response = await chrome.tabs.sendMessage(tabId, {
                        type: MESSAGES.VALIDATE_CACHE_AND_TAG_DOM,
                        payload: { cachedData: cached },
                    });

                    if (response?.ok) {
                        // DOM is tagged, we can use the cache.
                        sendResponse({
                            type: MESSAGES.UPDATE_VIEW,
                            payload: { content: cached },
                        });
                        return;
                    }
                    // If validation fails, the content script will automatically re-extract.
                    // We just need to wait for the EXTRACTION_RESULT.
                } else {
                    // No cache, so trigger a fresh extraction.
                    const result = await triggerExtraction(tabId, url);
                    if (result.payload.status !== "error") {
                        await setCachedContent(result.payload, url);
                        sendResponse({
                            type: MESSAGES.UPDATE_VIEW,
                            payload: { content: result.payload },
                        });
                    }
                }
            } else if (message.type === MESSAGES.EXTRACTION_RESULT) {
                // This message now also comes from the cache validation flow
                if (sender.tab?.url) {
                    await setCachedContent(message.payload, sender.tab.url);
                    // Forward the fresh data to the side panel
                    chrome.runtime.sendMessage({
                        type: MESSAGES.UPDATE_VIEW,
                        payload: { content: message.payload },
                    });
                }
            } else if (message.type === MESSAGES.FOCUS_ELEMENT) {
                // Forward the focus message to the content script
                if (sender.tab?.id) {
                    chrome.tabs.sendMessage(sender.tab.id, message);
                }
            }
        })();
        return true; // Async response
    }
);

/**
 * Triggers the content extraction in the specified tab.
 * This function assumes that the content script is already injected and ready.
 * It should be called after a successful check from `ensureContentScriptInjected`.
 *
 * @param tabId The ID of the tab to trigger extraction in.
 * @param url The URL of the page, passed to the content script.
 * @returns A promise that resolves with the extraction result from the content script.
 */
const triggerExtraction = async (tabId: number, url: string) => {
    try {
        const response = await chrome.tabs.sendMessage(tabId, {
            type: MESSAGES.EXTRACT_CONTENT,
            payload: { url },
        });
        return response;
    } catch (error) {
        console.error(
            `Failed to send EXTRACT_CONTENT message to tab ${tabId}:`,
            error
        );
        // No retry here. The onMessage listener ensures the script is ready.
        // A failure at this stage points to a more significant problem.
        return {
            type: MESSAGES.EXTRACTION_RESULT,
            payload: {
                status: "error",
                message: "Failed to communicate with content script.",
            },
        };
    }
};

/**
 * Ensures the content script is injected and ready to receive messages.
 *
 * This function first tries to ping the content script. If the ping fails,
 * it injects the script and pings again. This handles cases where the script
 * might not have been automatically injected or has become inactive.
 * The try-catch block is crucial for handling errors that can occur if the
 * extension attempts to inject a script into a restricted page (e.g., chrome:// pages)
 * or a tab that no longer exists. And invalid tab ID, or if the extension lacks host
   permissions for the target URL. The try...catch ensures these errors are handled gracefully
   without crashing the extension.
 *
 * @param tabId The ID of the tab to ensure the script is injected into.
 * @returns A promise that resolves to true if the script is ready, false otherwise.
 */
async function ensureContentScriptInjected(tabId: number): Promise<boolean> {
    try {
        // First, try to ping the content script to see if it's already there and listening.
        const response = await chrome.tabs.sendMessage(tabId, {
            type: MESSAGES.PING,
        });

        if (response?.ok) {
            return true; // Script is already injected and active.
        }
    } catch (e) {
        // An error here likely means the content script isn't injected, which is expected.
        console.log("Content script ping failed, attempting to inject...");
    }

    try {
        // If the ping fails, inject the script.
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ["content.js"],
        });

        // After injecting, ping again to confirm it's ready.
        const response = await chrome.tabs.sendMessage(tabId, {
            type: MESSAGES.PING,
        });
        return response?.ok || false;
    } catch (error) {
        console.error(
            `Failed to inject or communicate with content script in tab ${tabId}:`,
            error
        );
        return false;
    }
}

// SPA navigation listener
chrome.webNavigation.onHistoryStateUpdated.addListener(
    debounce(async (details) => {
        try {
            await chrome.runtime.sendMessage({
                type: MESSAGES.PING,
            });
        } catch (err) {
            return;
        }

        const cached = await getCachedContent(details.url);
        if (cached) {
            chrome.runtime.sendMessage({
                type: MESSAGES.UPDATE_VIEW,
                payload: { content: cached },
            });
            return;
        }

        // Ensure the content script is ready before triggering extraction
        const isReady = await ensureContentScriptInjected(details.tabId);
        if (isReady) {
            const extractedResponse = await triggerExtraction(
                details.tabId,
                details.url
            );
            if (extractedResponse?.payload?.status === "success") {
                setCachedContent(extractedResponse.payload, details.url);

                chrome.runtime.sendMessage({
                    type: MESSAGES.UPDATE_VIEW,
                    payload: { content: extractedResponse.payload },
                });
            }
        }
    }, 500),
    geminiNavigationFilter
);
