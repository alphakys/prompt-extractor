// src/shared/config.ts

/**
 * A configuration file to store constants such as URL patterns and CSS selectors.
 * This makes the extension easier to maintain and update if the target website changes.
 */
export const config = {
    // URL patterns to match the sites this extension works on.
    ALLOWED_URL: ["https://gemini.google.com/app/"],

    // A map of CSS selectors for different sites.
    SELECTORS: {
        // Selectors for the Gemini web application.
        gemini: {
            // The main container for the chat content.
            promptContainer: "span.user-query-bubble-with-background",
        },
    },
};
