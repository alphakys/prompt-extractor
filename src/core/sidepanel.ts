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
    cardListElem.innerHTML = ""; // Clear previous content

    if (!promptArr || promptArr.length === 0) {
        cardListElem.innerHTML = `<div class="status-message">No prompts found.</div>`;
        return;
    }

    promptArr.forEach((prompt, index) => {
        const cardElement = createPromptCard(prompt, index);
        cardListElem.appendChild(cardElement);
    });
}

/**
 * Creates a single prompt card element.
 * @param prompt - An array of strings representing the prompt content.
 * @param index - The index of the prompt, used for the title.
 * @returns A DIV element representing the card.
 */
function createPromptCard(prompt: string[], index: number): HTMLDivElement {
    const cardDiv = document.createElement("div");
    cardDiv.className = "card";

    const header = document.createElement("h3");
    header.textContent = `Prompt-${index + 1}`;
    cardDiv.appendChild(header);

    // Create a container for buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";

    // Add Copy Button
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", () => {
        const textToCopy = prompt.join("\n");
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyBtn.textContent = "Copied!";
            setTimeout(() => {
                copyBtn.textContent = "Copy";
            }, 2000);
        });
    });
    buttonContainer.appendChild(copyBtn);
    cardDiv.appendChild(buttonContainer);


    const wrapper = document.createElement("div");
    wrapper.className = "card-content";
    wrapper.dataset.id = `prompt-${index + 1}`;

    prompt.forEach((content) => {
        const p = document.createElement("p");
        p.textContent = content;
        wrapper.appendChild(p);
    });
    cardDiv.appendChild(wrapper);

    // Add a toggle button only if the content is long
    if (prompt.length > 4) {
        wrapper.classList.add("truncated");
        const toggleBtn = document.createElement("button");
        toggleBtn.className = "toggle-btn";
        toggleBtn.innerHTML =
            'More <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';

        toggleBtn.addEventListener("click", () => {
            const isTruncated = wrapper.classList.toggle("truncated");
            toggleBtn.innerHTML = isTruncated
                ? 'More <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>'
                : 'Less <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>';
        });
        cardDiv.appendChild(toggleBtn);
    }

    return cardDiv;
}

// Helper for loading state
function showLoading(isLoading: boolean) {
    const loadingElem = document.getElementById("loading");
    if (loadingElem) {
        loadingElem.hidden = !isLoading;
    }
}
