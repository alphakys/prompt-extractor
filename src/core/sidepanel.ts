// src/ts/sidepanel.ts
import { MESSAGES, MessagePayloads } from "../shared/messages";

// On load, request content
document.addEventListener("DOMContentLoaded", async () => {
    showLoading(true);

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
        console.log("No active tab");
        showLoading(false);
        return;
    }

    const tab = tabs[0];
    chrome.runtime.sendMessage(
        {
            type: MESSAGES.REQUEST_CONTENT,
            payload: { tabId: tab.id, url: tab.url },
        } as {
            type: typeof MESSAGES.REQUEST_CONTENT;
            payload: MessagePayloads[typeof MESSAGES.REQUEST_CONTENT];
        },
        (response: { type: keyof MessagePayloads; payload: any }) => {
            if (
                response.type === MESSAGES.UPDATE_VIEW
                // response.payload.content.data.body
            ) {
                console.log("Update view message from background > ", response);
                renderPrompt(response.payload.content.data.body);
            } else {
                console.log("Empty content > ", response);
                renderPrompt([]);
            }
        }
    );
});

// Message listener for updates
chrome.runtime.onMessage.addListener(
    (
        message: { type: keyof MessagePayloads; payload: any }
        // sender,
        // sendResponse
    ) => {
        console.log("sidepanel message > ", message);
        if (message.type === MESSAGES.UPDATE_VIEW && message.payload.content) {
            showLoading(false);
            console.log("onMessage , Update view message from background > ", message);
            renderPrompt(message.payload.content.data.body);
        } else {
            console.log("Empty content > ", message);
            renderPrompt([]);
        }
    }
);

function renderPrompt(promptArr: string[][]): void {
    const cardListElem = document.querySelector(".card-list");
    if (!cardListElem) return;

    showLoading(false);

    cardListElem.innerHTML = "";
    if (!promptArr || promptArr.length === 0) {
        cardListElem.innerHTML = `<div class="status-message">No prompts found.</div>`;
        return;
    }

    promptArr.forEach((prompt, index) => {
        const cardDiv: HTMLDivElement = document.createElement("div");
        cardDiv.classList.add("card");

        const header: HTMLHeadingElement = document.createElement("h3");
        header.textContent = `Prompt-${(index + 1).toString()}`;

        const wrapper: HTMLDivElement = document.createElement("div");
        wrapper.classList.add("card-content");
        wrapper.setAttribute("data-id", `prompt-${(index + 1).toString()}`);

        prompt.forEach((content) => {
            const para: HTMLParagraphElement = document.createElement("p");
            para.textContent = content;
            wrapper.appendChild(para);
        });

        cardDiv.appendChild(header);
        cardDiv.appendChild(wrapper);

        if (prompt.length > 4) {
            wrapper.classList.add("truncated");
            const toggleBtn: HTMLButtonElement =
                document.createElement("button");
            toggleBtn.classList.add("toggle-btn");
            toggleBtn.innerHTML =
                'More <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';

            toggleBtn.addEventListener("click", () => {
                const isTruncated = wrapper.classList.contains("truncated");
                wrapper.classList.toggle("truncated", !isTruncated);

                if (isTruncated) {
                    toggleBtn.innerHTML =
                        'Less <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>';
                } else {
                    toggleBtn.innerHTML =
                        'More <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
                }
            });
            cardDiv.appendChild(toggleBtn);
        }

        cardListElem.appendChild(cardDiv);
    });
}

// Helper for loading state
function showLoading(isLoading: boolean) {
    const loadingElem = document.getElementById("loading");
    if (loadingElem) {
        loadingElem.hidden = !isLoading;
    }
}
