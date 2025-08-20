const cachedKey = (url: string) => `prompts_${url}`;

export async function getCachedContent(url: string): Promise<any | null> {
    const key = cachedKey(url);
    const res = await chrome.storage.session.get(key);
    return (res?.[key] as string | undefined) ?? null;
}

export async function setCachedContent(data: any, url: string): Promise<void> {
    const key = cachedKey(url);
    await chrome.storage.session.set({ [key]: data });
}

export async function clearCachedContent(url: string): Promise<void> {
    const key = cachedKey(url);
    await chrome.storage.session.remove(key);
}
