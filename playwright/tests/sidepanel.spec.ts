
// playwright/tests/sidepanel.spec.ts
import { test, expect, chromium, type Browser, type Page } from "@playwright/test";

// Declare variables for the browser and page to use in tests
let browser: Browser;
let page: Page;

test.beforeAll(async () => {
    // Connect to the existing Chrome instance
    browser = await chromium.connectOverCDP("http://localhost:9222");

    // Use the existing context and page if available, or create a new one
    const defaultContext = browser.contexts()[0];
    page = defaultContext.pages()[0] || (await defaultContext.newPage());
});

test.afterAll(async () => {
    // Note: It's often better not to close the browser in this setup,
    // as it's a manually managed instance.
    await browser.close();
    console.log("Browser is successfully closed");
});

test("side panel opens and displays content", async () => {
    await page.goto("https://gemini.google.com/app/2498d822f3c2527d");
    // Check site title for connection success
    await expect(page).toHaveTitle(/Google Gemini/);

    // Click the extension icon to open the side panel
    await page.evaluate(() => {
        chrome.action.onClicked.dispatch({
            id: "gemini_prompt_extractor",
            title: "Gemini Prompt Extractor",
            url: "https://gemini.google.com/app/2498d822f3c2527d",
        } as chrome.tabs.Tab);
    });

    // Wait for the side panel to open
    // The side panel is in a separate frame, so we need to find it.
    // A better approach would be to listen for the side panel to be created,
    // but that's not straightforward in Playwright when connecting to an existing browser.
    // Instead, we'll look for a known element in the side panel.
    await page.waitForSelector('iframe[src*="sidepanel.html"]');
    const sidePanelFrame = page.frame({ url: /sidepanel.html/ });
    expect(sidePanelFrame).not.toBeNull();

    if (sidePanelFrame) {
        // Check for a known element in the side panel
        const titleElement = await sidePanelFrame.waitForSelector("h1");
        const titleText = await titleElement.textContent();
        expect(titleText).toBe("Gemini Prompt Extractor");

        // Check for extracted content
        const contentElement = await sidePanelFrame.waitForSelector(".prompt-container");
        expect(contentElement).not.toBeNull();
    }
});
