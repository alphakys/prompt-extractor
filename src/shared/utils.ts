const geminiUrlFilter: chrome.events.UrlFilter = {
    hostEquals: "gemini.google.com",
    pathPrefix: "/app/",
};

const chatGPTUrlFilter: chrome.events.UrlFilter = {
    hostEquals: "chatgpt.com",
    pathPrefix: "/c/",
};

const actionUrlConditions = [
    new chrome.declarativeContent.PageStateMatcher({
        pageUrl: geminiUrlFilter,
    }),
    new chrome.declarativeContent.PageStateMatcher({
        pageUrl: chatGPTUrlFilter,
    }),
];

export const urlFilterRule = {
    conditions: actionUrlConditions,
    actions: [new chrome.declarativeContent.ShowAction()],
};

export const navigationFilter: chrome.webNavigation.WebNavigationEventFilter = {
    url: [geminiUrlFilter, chatGPTUrlFilter],
};