// src/ts/background.ts (Updated with delay and retries to resolve timing issue)
import { MESSAGES, MessagePayloads } from "../shared/messages";
import { config } from "../shared/config";
import { geminiUrlFilterRule, geminiNavigationFilter } from "../shared/utils";
import { getCachedContent, setCachedContent } from "../shared/storage";
// Type aliases for clarity (assume from types.ts)
type ExtractionResult = MessagePayloads[typeof MESSAGES.EXTRACTION_RESULT];
const TRIGGER_MAX_RETRIES = 3;

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed");

    // sessinoStorage access is enabled by default everywhere
    chrome.storage.session.setAccessLevel({
        accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
    });

    // Side panel action click disabled by default
    chrome.sidePanel
        .setPanelBehavior({ openPanelOnActionClick: false })
        .catch((error) =>
            console.error("<onInstalled> something wrong: ", error)
        );

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

// Trigger extraction with debounce, including injection fallback and retries
const triggerExtraction = async (tabId: number, url: string) => {
    let attempt = 0;
    while (attempt < TRIGGER_MAX_RETRIES) {
        try {
            const response = await chrome.tabs.sendMessage(tabId, {
                type: MESSAGES.EXTRACT_CONTENT,
                payload: { url },
            } as {
                type: typeof MESSAGES.EXTRACT_CONTENT;
                payload: MessagePayloads[typeof MESSAGES.EXTRACT_CONTENT];
            });
            return response; // Success, exit loop
        } catch (error) {
            console.log("Content is not injected attept is ", attempt);
            const isListenerReady = await ensureContentInjected(tabId);
            if (!isListenerReady) {
                attempt++;
                continue;
            }
            return;
        }
    }
    console.error("Max retries exceeded for extraction trigger.");
};

// Cache config
const MAX_CACHE_ENTRIES = 50;
const CACHE_KEYS_KEY = "cache_keys"; // Metadata key for FIFO queue

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
            if (message.type === MESSAGES.GET_LATEST_CONTENT) {
                const { tabId, url } = message.payload;
                const cached = await getCachedContent(url);
                if (cached) {
                    console.log("Cache is hit : ", cached);
                    sendResponse({
                        type: MESSAGES.UPDATE_VIEW,
                        payload: { content: cached },
                    });
                } else {
                    // Trigger extraction if cache empty
                    const isInjected = await injectContentScript(tabId); // Ensure injected before trigger
                    if (isInjected) {
                        const result = await triggerExtraction(tabId, url);
                        await setCachedContent(result.payload, url);

                        sendResponse({
                            type: MESSAGES.UPDATE_VIEW,
                            payload: { content: result.payload },
                        });
                    }
                }
            } else if (message.type === MESSAGES.EXTRACTION_RESULT) {
                // const tabId = sender.tab?.id ?? 0;
                // if (tabId === 0) return;
                // const sessionKey = `prompt_${url}`;
                // if (message.payload.status === "success") {
                //     await evictOldestCache();
                //     const { [CACHE_KEYS_KEY]: keys = [] } =
                //         await chrome.storage.session.get(CACHE_KEYS_KEY);
                //     keys.push(sessionKey);
                //     await chrome.storage.session.set({
                //         [sessionKey]: message.payload,
                //         [CACHE_KEYS_KEY]: keys,
                //     });
                //     // Update side panel
                //     await chrome.runtime.sendMessage({
                //         type: MESSAGES.UPDATE_VIEW,
                //         payload: {
                //             content: message.payload,
                //         },
                //     });
                // }
            }
        })();
        return true; // Async response
    }
);

// <Improvement requirement>
// We can integrate this two logic (injectContentScript and ensureContentInjected)
// Let's Craft cleaner code for improving readability

// Helper to inject content script programmatically
async function injectContentScript(tabId: number): Promise<boolean> {
    // <Improvement requirement>
    // Is try catch syntax is needed? What error can occurred in this code base?
    // </Improvement requirement>
    try {
        const injectionResults = await chrome.scripting.executeScript({
            target: { tabId },
            files: ["content.js"],
        });

        if (injectionResults.length > 0) {
            console.log(
                "Content script injected successfully into tab:",
                injectionResults
            );
            // Ping to content script
            const response = await chrome.tabs.sendMessage(tabId, {
                type: MESSAGES.PING,
            });
            return response.ok;
        }

        return false;
    } catch (error) {
        console.error("Failed to inject content script:", error);
        return false;
    }
}

async function ensureContentInjected(tabId: number): Promise<boolean> {
    const response = await chrome.tabs.sendMessage(tabId, {
        type: MESSAGES.PING,
    });
    if (response.ok) return true;

    const isInjected = await injectContentScript(tabId);
    if (!isInjected) {
        return false;
    }
    return await chrome.tabs.sendMessage(tabId, { type: MESSAGES.PING });
}

// </Improvement requirement>


// SPA navigation listener
chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
    const cached = await getCachedContent(details.url);
    console.log("isCached > ", cached);
    if (cached) {
        console.log("web navigation cached :", cached);

        chrome.runtime.sendMessage({
            type: MESSAGES.UPDATE_VIEW,
            payload: { content: cached },
        });
        return;
    }
    const extractedResponse = await triggerExtraction(
        details.tabId,
        details.url
    );

    setCachedContent(extractedResponse.payload.content.body, details.url);
    chrome.runtime.sendMessage({
        type: MESSAGES.UPDATE_VIEW,
        payload: { content: extractedResponse.payload.content.body },
    });
}, geminiNavigationFilter);
