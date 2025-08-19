// src/ts/content.ts (Updated for integration)
import { MESSAGES, MessagePayloads } from "../shared/messages";
import { IExtractor, ExtractionResult } from "../shared/types";
import { GeminiExtractor } from "../extractors/geminiExtractor";

declare global {
    interface Window {
        __SIDE_PANEL_EXTRACTOR_LOADED__?: boolean;
    }
}

// Registry of extractors (expand by adding more imports/classes)
const extractors: IExtractor[] = [new GeminiExtractor()];

if (!window.__SIDE_PANEL_EXTRACTOR_LOADED__) {
    window.__SIDE_PANEL_EXTRACTOR_LOADED__ = true;

    console.log("Content script is injected!!!!!!");
    chrome.runtime.onMessage.addListener(
        (
            message: { type: keyof MessagePayloads; payload: any },
            sender,
            sendResponse
        ) => {
            (async () => {
                // Handshake: lets background verify the listener exists
                if (message.type == MESSAGES.PING) {
                    sendResponse({ ok: true });
                    return;
                }

                if (message.type === MESSAGES.EXTRACT_CONTENT) {
                    (async () => {
                        const { url } = message.payload;
                        const extractor = extractors[0];
                        let result: ExtractionResult;

                        if (!extractor) {
                            // Graceful fallback: No matching extractor
                            result = {
                                status: "error",
                                message: "No matching extractor for URL",
                            };
                        } else {
                            try {
                                result = await extractWithRetry(extractor);
                            } catch (error) {
                                result = {
                                    status: "error",
                                    message: (error as Error).message,
                                };
                            }
                        }

                        // Handle edge cases: e.g., permission denials (activeTab) or CSP; here, assume checked upstream, but log/send error
                        if (chrome.runtime.lastError) {
                            result = {
                                status: "error",
                                message:
                                    "Runtime error, possibly permissions or CSP issue",
                            };
                            // For CSP bypass, manifest would need declarativeNetRequest; prompt via background if needed
                        }

                        sendResponse({
                            type: MESSAGES.EXTRACTION_RESULT,
                            payload: result,
                        });
                    })();
                    return true; // Keep channel open for async response
                }
            })();

            // We reply asynchronously in some branches
            return true;
        }
    );
}

// Retry with exponential backoff (direct from TDD pseudocode)
async function extractWithRetry(
    extractor: IExtractor,
    maxRetries: number = 3
): Promise<ExtractionResult> {
    let attempt: number = 0;
    let delay: number = 100; // ms
    while (attempt < maxRetries) {
        try {
            // Enhanced DOM readiness: Use MutationObserver for SPA dynamic loads
            await new Promise((resolve, reject) => {
                const observer = new MutationObserver((mutations) => {
                    console.log(
                        "<Content.MutationObserver> mutations : ",
                        mutations
                    );
                    if (document.readyState === "complete") {
                        observer.disconnect();
                        resolve(null);
                    }
                });

                const mutationOptions = {
                    childList: true,
                    subtree: true,
                    // CharacterData: true,
                };
                observer.observe(document, mutationOptions);
                setTimeout(() => {
                    observer.disconnect();
                    reject(new Error("DOM readiness timeout"));
                }, 5000); // 5s timeout to prevent hangs
            });

            return await extractor.extract();
        } catch (error) {
            attempt++;
            console.log("attempt : ", attempt);
            if (attempt >= maxRetries) {
                return { status: "error", message: (error as Error).message };
            }
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
    return { status: "error", message: "Max retries exceeded" };
}
