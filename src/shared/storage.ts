// /src/shared/storage.ts
const keyForTab = (tabId: number) => `content:${tabId}`;

export async function getCachedContent(tabId: number): Promise<string | null> {
    const key = keyForTab(tabId);
    const res = await chrome.storage.session.get(key);
    return (res?.[key] as string | undefined) ?? null;
}

export async function setCachedContent(
    tabId: number,
    data: string
): Promise<void> {
    const key = keyForTab(tabId);
    await chrome.storage.session.set({ [key]: data });
}

export async function clearCachedContent(tabId: number): Promise<void> {
    const key = keyForTab(tabId);
    await chrome.storage.session.remove(key);
}
