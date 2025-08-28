// playwright/tests/example.spec.ts
import {
    test,
    expect,
    chromium,
    type Browser,
    type Page,
} from "@playwright/test";

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

// Your actual test
test("my test", async () => {
    await page.goto("https://gemini.google.com/app/2498d822f3c2527d");
    // Check site title for connection success
    await expect(page).toHaveTitle(/Google Gemini/);



});
