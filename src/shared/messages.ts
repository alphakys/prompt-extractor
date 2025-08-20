import { ExtractionResult } from "./types";

export const MESSAGES = {
    REQUEST_CONTENT: "REQUEST_CONTENT",
    EXTRACT_CONTENT: "EXTRACT_CONTENT",
    EXTRACTION_RESULT: "EXTRACTION_RESULT",
    UPDATE_VIEW: "UPDATE_VIEW",
    PING: "PING",
    FOCUS_ELEMENT: "FOCUS_ELEMENT",
    VALIDATE_CACHE_AND_TAG_DOM: "VALIDATE_CACHE_AND_TAG_DOM",
} as const;

export type MessagePayloads = {
    [MESSAGES.REQUEST_CONTENT]: { tabId: number; url: string };
    [MESSAGES.EXTRACT_CONTENT]: { url: string };
    [MESSAGES.EXTRACTION_RESULT]: ExtractionResult; // Reference from types.ts
    [MESSAGES.UPDATE_VIEW]: { content: ExtractionResult };
    [MESSAGES.PING]: void;
    [MESSAGES.FOCUS_ELEMENT]: { elementId: string };
    [MESSAGES.VALIDATE_CACHE_AND_TAG_DOM]: { cachedData: ExtractionResult };
};
