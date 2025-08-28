import { MESSAGES, MessagePayloads } from "../shared/messages";
import { PromptData } from "../shared/types";

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
        },
        (response: { type: keyof MessagePayloads; payload: any }) => {
            if (response.type === MESSAGES.UPDATE_VIEW) {
                renderCards(response.payload.content.data.body);
            } else {
                renderCards([]);
            }
        }
    );
});

// Message listener for updates
chrome.runtime.onMessage.addListener(
    (
        message: { type: keyof MessagePayloads; payload: any },
        sender,
        sendResponse: (response: { status: boolean }) => void
    ) => {
        if (message.type === MESSAGES.UPDATE_VIEW && message.payload.content) {
            showLoading(false);
            renderCards(message.payload.content.data.body);
        } else {
            renderCards([]);
        }

        if (message.type === MESSAGES.PING) {
            sendResponse({ status: true });
            return;
        }
    }
);

// Function to render all cards
function renderCards(promptArr: PromptData[]): void {
    const cardListElem = document.querySelector(".card-list");
    if (!cardListElem) return;

    // Clear existing content
    cardListElem.innerHTML = "";

    // Hide loading spinner
    showLoading(false);

    promptArr.forEach((prompt: PromptData) => {
        const cardElement = createCard(prompt);
        cardListElem.appendChild(cardElement);
    });
}

// Function to create a single card element
function createCard(prompt: PromptData): HTMLDivElement {
    const cardDiv = document.createElement("div");
    cardDiv.className = "card";
    cardDiv.dataset.promptId = prompt.id; // Store id for event delegation

    // --- Header ---
    const header = document.createElement("h3");
    header.textContent = prompt.id;
    cardDiv.appendChild(header);

    // --- Content ---
    const wrapper = document.createElement("div");
    wrapper.className = "card-content truncated";
    wrapper.id = prompt.id;

    prompt.content.forEach((content) => {
        const contentParagraph = document.createElement("p");
        contentParagraph.textContent = content;
        wrapper.appendChild(contentParagraph);
    });
    cardDiv.appendChild(wrapper);

    // --- Actions ---
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "card-actions";

    // Left Group: Expand/Collapse if expandable
    if (prompt.content.length > 4 || prompt.content.join("").length > 200) {
        const leftGroup = document.createElement("div");
        leftGroup.className = "action-group";

        const toggleBtn = document.createElement("button");
        toggleBtn.className = "action-btn toggle-btn";
        toggleBtn.setAttribute("aria-expanded", "false");
        toggleBtn.setAttribute("aria-controls", wrapper.id);
        toggleBtn.innerHTML = `More <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`;
        leftGroup.appendChild(toggleBtn);
        actionsDiv.appendChild(leftGroup);
    }

    // Right Group: Copy + Move
    const rightGroup = document.createElement("div");
    rightGroup.className = "action-group";

    const copyBtn = document.createElement("button");
    copyBtn.className = "action-btn copy-btn";
    copyBtn.innerHTML = `Copy <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;

    const moveBtn = document.createElement("button");
    moveBtn.className = "action-btn move-btn";
    moveBtn.innerHTML = `Move <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="9" cy="5" r="1.5"/>
      <circle cx="15" cy="5" r="1.5"/>
      <circle cx="9" cy="12" r="1.5"/>
      <circle cx="15" cy="12" r="1.5"/>
      <circle cx="9" cy="19" r="1.5"/>
      <circle cx="15" cy="19" r="1.5"/>
    </svg>`;

    rightGroup.appendChild(copyBtn);
    rightGroup.appendChild(moveBtn);
    actionsDiv.appendChild(rightGroup);

    cardDiv.appendChild(actionsDiv);

    return cardDiv;
}

// --- Event Delegation Setup ---
document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const actionBtn = target.closest(".action-btn");

    if (!actionBtn) return;

    const card = actionBtn.closest(".card") as HTMLDivElement;
    const promptId = card?.dataset.promptId;

    if (!promptId) return;

    // Handle Toggle Button
    if (actionBtn.classList.contains("toggle-btn")) {
        const wrapper = document.getElementById(promptId);
        if (wrapper) {
            const isTruncated = wrapper.classList.toggle("truncated");
            actionBtn.setAttribute("aria-expanded", String(!isTruncated));
            actionBtn.innerHTML = !isTruncated
                ? `Less <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>`
                : `More <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`;
        }
    }

    // Handle Copy Button
    if (actionBtn.classList.contains("copy-btn")) {
        const wrapper = document.getElementById(promptId);
        if (wrapper) {
            navigator.clipboard
                .writeText(wrapper.innerText)
                .then(() => {
                    const originalHTML = actionBtn.innerHTML;
                    actionBtn.innerHTML = `Copied!`;
                    setTimeout(() => {
                        actionBtn.innerHTML = originalHTML;
                    }, 2000);
                })
                .catch((err) => {
                    console.error("Failed to copy: ", err);
                    const originalHTML = actionBtn.innerHTML;
                    actionBtn.innerHTML = `Failed!`;
                    setTimeout(() => {
                        actionBtn.innerHTML = originalHTML;
                    }, 2000);
                });
        }
    }

    // Handle Move Button
    if (actionBtn.classList.contains("move-btn")) {
        console.log(`Move card ${promptId} functionality would go here`);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0].id;
            if (!tabId) return;

            chrome.tabs.sendMessage(tabId, {
                type: MESSAGES.FOCUS_ELEMENT,
                payload: { elementId: promptId },
            });
        });
    }
});

// Helper for loading state
function showLoading(isLoading: boolean) {
    const loadingElem = document.getElementById("loading");
    if (loadingElem) {
        loadingElem.hidden = !isLoading;
    }
}
