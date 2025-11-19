// Fix: Declare chrome to avoid TypeScript errors
declare const chrome: any;

// This runs in the background.
// You can use this to handle keyboard shortcuts globally if content scripts fail,
// or to handle CORS requests if the API blocks the content script.

chrome.runtime.onInstalled.addListener(() => {
  console.log("Groq Recorder Extension Installed");
});

// Optional: Allow clicking the extension icon to toggle the recorder
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Dispatch a custom event that your React component listens to (optional)
        // Or simply rely on the Ctrl+K shortcut defined in the content script.
        const event = new KeyboardEvent('keydown', {
          key: 'k',
          code: 'KeyK',
          ctrlKey: true,
          bubbles: true
        });
        window.dispatchEvent(event);
      }
    });
  }
});