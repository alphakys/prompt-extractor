// src/shared/config.ts

/**
 * A configuration file to store constants such as URL patterns and CSS selectors.
 * This makes the extension easier to maintain and update if the target website changes.
 */
export const config = {
    // URL patterns to match the sites this extension works on.
    ALLOWED_URL: ["https://gemini.google.com/app/", "https://chatgpt.com/c/"],

    // A map of CSS selectors for different sites.
    SELECTORS: {
        // Selectors for the Gemini web application.
        gemini: {
            // The main container for the chat content.
            promptContainer: "span.user-query-bubble-with-background",
        },
        openai: {
            // The main container for the chat content.
            // Select the user message wrapper nodes; robust to minor UI changes
            promptContainer: 'div[data-message-author-role="user"]',
        },
    },
};
