export interface IExtractor {
    extract(): Promise<ExtractionResult>;
}

export type PromptData = {
    id: string;
    content: string[];
};

export type ExtractionResult =
    | {
          status: "success";
          data: {
              body: PromptData[];
          };
      }
    | { status: "error"; message: string };
