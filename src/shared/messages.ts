import { ExtractionResult } from "./types";

export const MESSAGES = {
    GET_LATEST_CONTENT: "GET_LATEST_CONTENT", // <Improvement requirement>key of MESSAGE object GET_LATEST_CONTENT naming is so awkward so I want to rename it. </Improvement requirement>
    EXTRACT_CONTENT: "EXTRACT_CONTENT",
    EXTRACTION_RESULT: "EXTRACTION_RESULT",
    UPDATE_VIEW: "UPDATE_VIEW",
    PING: "PING",
} as const;

export type MessagePayloads = {
    [MESSAGES.GET_LATEST_CONTENT]: { tabId: number, url: string };
    [MESSAGES.EXTRACT_CONTENT]: { url: string };
    [MESSAGES.EXTRACTION_RESULT]: ExtractionResult; // Reference from types.ts
    [MESSAGES.UPDATE_VIEW]: { content: string };
    [MESSAGES.PING]: void;
};
