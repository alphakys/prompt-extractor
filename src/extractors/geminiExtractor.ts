import { config } from "../shared/config";
import { ExtractionResult, PromptData } from "../shared/types";
import { IExtractor } from "../shared/types";

export class GeminiExtractor implements IExtractor {
    async extract(): Promise<ExtractionResult> {
        try {
            const promptContainers = document.querySelectorAll(
                config.SELECTORS.gemini.promptContainer
            );

            if (promptContainers.length === 0) {
                return {
                    status: "error",
                    message: "Content element not found after polling.",
                };
            }

            const results: PromptData[] = [];

            promptContainers.forEach((container, index) => {
                const promptId = `prompt-${index}`;

                const paragraphs =
                    container.querySelectorAll("p.query-text-line");
                const currentPromptContent: string[] = [];

                paragraphs.forEach((p) => {
                    const text = p.textContent?.trim() || "";
                    if (text) {
                        currentPromptContent.push(text);
                    }
                });

                if (currentPromptContent.length > 0) {
                    results.push({
                        id: promptId,
                        content: currentPromptContent,
                    });
                }
            });

            console.log("Extracted and tagged content:", results);
            return {
                status: "success",
                data: {
                    body: results,
                },
            };
        } catch (error) {
            return { status: "error", message: (error as Error).message };
        }
    }
}
