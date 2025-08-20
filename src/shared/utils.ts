const geminiUrlFilter: chrome.events.UrlFilter = {
    hostEquals: "gemini.google.com",
    pathPrefix: "/app/",
};

const actionUrlCondition = [
    new chrome.declarativeContent.PageStateMatcher({
        pageUrl: geminiUrlFilter,
    }),
];

export const geminiUrlFilterRule = {
    conditions: actionUrlCondition,
    actions: [new chrome.declarativeContent.ShowAction()],
};

export const geminiNavigationFilter: chrome.webNavigation.WebNavigationEventFilter = {
    url: [geminiUrlFilter],
};
