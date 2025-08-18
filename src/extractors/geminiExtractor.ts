// src/extractors/geminiExtractor.ts
import { config } from "../shared/config";
import { ExtractionResult } from "../shared/types";
import { QueryPrompt, IExtractor } from "../shared/types";


export class GeminiExtractor implements IExtractor {
    canHandle(url: string): boolean {
        return config.URL_PATTERNS.some((pattern) =>
            new RegExp(pattern.replace(/\*/g, ".*")).test(url)
        );
    }

    async extract(): Promise<ExtractionResult> {
        try {
            const promptContainer = document.querySelectorAll(
                config.SELECTORS.gemini.promptContainer
            );

            if (!promptContainer || promptContainer.length === 0) {
                return {
                    status: "error",
                    message: "Content element not found after polling.",
                };
            }

            const baseUrl = window.location.href;
            const results: QueryPrompt[] = [];

            promptContainer.forEach((container, index) => {
                const groupId = `group-${Date.now()}-${index}`;
                const paragraphs =
                    container.querySelectorAll("p.query-text-line");
                const currentGroup: string[] = [];
                const groups: string[][] = [];

                paragraphs.forEach((p) => {
                    const text = p.textContent?.trim() || "";
                    const isEmpty =
                        !text ||
                        (p.children.length === 1 &&
                            p.firstElementChild?.tagName === "BR");

                    if (isEmpty && currentGroup.length > 0) {
                        groups.push([...currentGroup]);
                        currentGroup.length = 0;
                    } else if (text) {
                        currentGroup.push(text);
                    }
                });

                if (currentGroup.length > 0) {
                    groups.push(currentGroup);
                }

                groups.forEach((group, groupIndex) => {
                    results.push({
                        id: `${groupId}-subgroup-${groupIndex}`,
                        content: group,
                        sourceUrl: baseUrl,
                    });
                });
            });

            console.log("Extracted content:", results);
            return {
                status: "success",
                data: {
                    prompts: results,
                    metadata: { timestamp: new Date() },
                },
            };
        } catch (error) {
            return { status: "error", message: (error as Error).message };
        }
    }
}
