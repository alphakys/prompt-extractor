// src/ts/content.ts (Updated for integration)
import { MESSAGES, MessagePayloads } from "../shared/messages";
import { IExtractor, ExtractionResult, PromptData } from "../shared/types";
import { GeminiExtractor } from "../extractors/geminiExtractor";
import { config } from "../shared/config";

declare global {
    interface Window {
        __SIDE_PANEL_EXTRACTOR_LOADED__?: boolean;
    }
}

// Registry of extractors (expand by adding more imports/classes)
const extractors: IExtractor[] = [new GeminiExtractor()];

if (!window.__SIDE_PANEL_EXTRACTOR_LOADED__) {
    window.__SIDE_PANEL_EXTRACTOR_LOADED__ = true;

    chrome.runtime.onMessage.addListener(
        (
            message: { type: keyof MessagePayloads; payload: any },
            sender,
            sendResponse
        ) => {
            (async () => {
                if (message.type === MESSAGES.PING) {
                    sendResponse({ ok: true });
                    return;
                }

                if (message.type === MESSAGES.EXTRACT_CONTENT) {
                    handleExtraction(sendResponse);
                    return true; // Keep channel open for async response
                }

                if (message.type === MESSAGES.FOCUS_ELEMENT) {
                    console.log("Focus Element : ", message.payload.elementId);
                    handleFocus(message.payload.elementId);
                    return;
                }

                if (message.type === MESSAGES.VALIDATE_CACHE_AND_TAG_DOM) {
                    const success = handleValidationAndTagging(
                        message.payload.cachedData
                    );
                    if (!success) {
                        // If validation fails, trigger a fresh extraction
                        handleExtraction(sendResponse);
                        return true; // Keep channel open for async response
                    }
                    sendResponse({ ok: true }); // Inform background that tagging was successful
                    return;
                }
            })();

            // We reply asynchronously in some branches
            return true;
        }
    );
}

async function handleExtraction(
    sendResponse: (response?: any) => void
): Promise<void> {
    const extractor = extractors[0];
    let result: ExtractionResult;

    if (!extractor) {
        result = {
            status: "error",
            message: "No matching extractor for URL",
        };
    } else {
        try {
            result = await extractWithRetry(extractor);
            if (result.status === "success") {
                tagDom(result);
            }
        } catch (error) {
            result = {
                status: "error",
                message: (error as Error).message,
            };
        }
    }

    sendResponse({
        type: MESSAGES.EXTRACTION_RESULT,
        payload: result,
    });
}

function handleFocus(elementId: string): void {
    const element = document.querySelector(
        `[data-gemini-prompt-id="${elementId}"]`
    ) as HTMLElement;

    console.log("handle Focus", element);
    if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });

        // Add a temporary highlight for visual feedback
        element.style.transition = "outline 0.2s ease-in-out";
        element.style.outline = "2px solid #8ab4f8";
        setTimeout(() => {
            element.style.outline = "none";
        }, 2000);
    }
}

function tagDom(extractionResult: ExtractionResult): void {
    if (extractionResult.status !== "success") return;

    const promptContainers = document.querySelectorAll(
        config.SELECTORS.gemini.promptContainer
    );

    promptContainers.forEach((container, index) => {
        const promptId = `prompt-${index}`;
        (container as HTMLElement).dataset.geminiPromptId = promptId;
    });

    console.log("DOM tagged successfully.");
}

function handleValidationAndTagging(cachedData: ExtractionResult): boolean {
    if (cachedData.status !== "success") return false;

    const promptContainers = document.querySelectorAll(
        config.SELECTORS.gemini.promptContainer
    );

    // If the number of prompts on the page doesn't match the cache, it's stale.
    if (promptContainers.length !== cachedData.data.body.length) {
        console.log("Cache is stale. Re-extracting.");
        return false;
    }

    // The DOM looks valid, so we can re-tag the elements.
    tagDom(cachedData);

    console.log("DOM re-tagged successfully from cache.");
    return true;
}

async function extractWithRetry(
    extractor: IExtractor,
    maxRetries: number = 3
): Promise<ExtractionResult> {
    let attempt: number = 0;
    let delay: number = 100; // ms
    while (attempt < maxRetries) {
        try {
            // Enhanced DOM readiness: Use polling with requestAnimationFrame for efficiency
            await new Promise<void>((resolve, reject) => {
                const startTime = Date.now();
                const timeout = 5000; // 5s timeout

                function poll() {
                    if (document.querySelector(config.SELECTORS.gemini.promptContainer)) {
                        resolve();
                    } else if (Date.now() - startTime > timeout) {
                        reject(new Error("DOM readiness timeout"));
                    } else {
                        requestAnimationFrame(poll);
                    }
                }

                poll();
            });

            return await extractor.extract();
        } catch (error) {
            attempt++;
            if (attempt >= maxRetries) {
                return { status: "error", message: (error as Error).message };
            }
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
    return { status: "error", message: "Max retries exceeded" };
}
