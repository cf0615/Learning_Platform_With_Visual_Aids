// customPopup.js

// Initialize Popup if not already present
function initializePopup() {
    if (!document.getElementById("custom-popup")) {
        const popupHTML = `
            <div id="custom-popup" class="popup-overlay hidden">
                <div class="popup-content">
                    <h2 id="popup-title">Title</h2>
                    <div id="popup-message">Message goes here...</div>
                    <div class="popup-buttons">
                        <button id="popup-confirm-btn">OK</button>
                        <button id="popup-cancel-btn">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML("beforeend", popupHTML);
    }
}

// Show Popup with Customizable Parameters
export function showPopup({
    title = "Default Title",
    message = "Default message",
    type = "info",  // "success", "error", "warning", "loading", etc.
    onConfirm = null,
    onCancel = null,
    showCancel = true  // Show or hide the Cancel button based on the popup type
} = {}) {
    initializePopup();

    const popupOverlay = document.getElementById("custom-popup");
    const popupTitle = document.getElementById("popup-title");
    const popupMessage = document.getElementById("popup-message");
    const confirmButton = document.getElementById("popup-confirm-btn");
    const cancelButton = document.getElementById("popup-cancel-btn");

    // Reset button display
    confirmButton.style.display = "inline-block";
    cancelButton.style.display = showCancel ? "inline-block" : "none";

    // Set title and message or loading spinner
    popupTitle.innerText = title;

    if (type === "loading") {
        popupMessage.innerHTML = `<div class="loading-spinner"></div><p>Loading, please wait...</p>`;
        confirmButton.style.display = "none"; // Hide confirm button for loading
        cancelButton.style.display = "none";  // Hide cancel button for loading
    } else {
        popupMessage.innerHTML = message;
    }

    // Apply styling class based on type
    popupOverlay.className = `popup-overlay ${type}`; // Adds class like "popup-overlay success"

    // Set button labels and visibility based on type
    switch (type) {
        case "confirmation":
            confirmButton.innerText = "OK";
            cancelButton.innerText = "Cancel";
            break;
        case "success":
            confirmButton.innerText = "OK";
            cancelButton.style.display = "none"; // Hide cancel button for success popup
            break;
        case "error":
            confirmButton.innerText = "OK";
            cancelButton.style.display = "none"; // Hide cancel button for error popup
            break;
        case "warning":
            confirmButton.innerText = "Yes";
            cancelButton.innerText = "No";
            break;
        case "information":
            confirmButton.innerText = "Got it";
            cancelButton.style.display = "none"; // Hide cancel button for information popup
            break;
        default:
            confirmButton.innerText = "OK";
            cancelButton.innerText = "Cancel";
    }

    // Show the popup
    popupOverlay.classList.remove("hidden");

    // Confirm button action
    confirmButton.onclick = () => {
        popupOverlay.classList.add("hidden"); // Hide the popup
        if (typeof onConfirm === "function") onConfirm(); // Call confirm callback if provided
    };

    // Cancel button action
    cancelButton.onclick = () => {
        popupOverlay.classList.add("hidden"); // Hide the popup
        if (typeof onCancel === "function") onCancel(); // Call cancel callback if provided
    };
}

// Hide the popup manually
export function hidePopup() {
    const popupOverlay = document.getElementById("custom-popup");
    if (popupOverlay) {
        popupOverlay.classList.add("hidden"); // Hide the popup overlay
    }
}
// Automatically hide popup on outside click
document.addEventListener("click", (e) => {
    const popupOverlay = document.getElementById("custom-popup");
    if (popupOverlay && e.target === popupOverlay) {
        popupOverlay.classList.add("hidden");
    }
});

// Show Input Popup for custom HTML content
export function showInputPopup({
    title = "Enter Information",
    htmlContent = "",
    onConfirm = null,
    onCancel = null,
    showCancel = true
} = {}) {
    initializePopup();

    const popupOverlay = document.getElementById("custom-popup");
    const popupTitle = document.getElementById("popup-title");
    const popupMessage = document.getElementById("popup-message");
    const confirmButton = document.getElementById("popup-confirm-btn");
    const cancelButton = document.getElementById("popup-cancel-btn");

    // Set title and custom HTML content as message
    popupTitle.innerText = title;
    popupMessage.innerHTML = htmlContent;

    // Set button labels and visibility
    confirmButton.innerText = "Submit";
    cancelButton.style.display = showCancel ? "inline-block" : "none";

    // Show the popup
    popupOverlay.classList.remove("hidden");

    // Confirm button action
    confirmButton.onclick = () => {
        popupOverlay.classList.add("hidden"); // Hide the popup
        if (typeof onConfirm === "function") onConfirm(); // Call confirm callback if provided
    };

    // Cancel button action
    cancelButton.onclick = () => {
        popupOverlay.classList.add("hidden"); // Hide the popup
        if (typeof onCancel === "function") onCancel(); // Call cancel callback if provided
    };
}