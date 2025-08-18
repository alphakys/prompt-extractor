// src/shared/types.ts
export interface QueryPrompt {
    id: string;
    content: string[];
    sourceUrl: string;
}

// src/shared/types.ts
export interface IExtractor {
    canHandle(url: string): boolean;
    extract(): Promise<ExtractionResult>;
}

export type ExtractionResult =
    | {
          status: "success";
          data: { prompts: QueryPrompt[]; metadata: { timestamp: Date } };
      }
    | { status: "error"; message: string };
