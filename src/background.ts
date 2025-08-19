// src/background.ts

/**
 * This script runs in the background and handles events for the extension.
 */

// Listen for the extension's action icon to be clicked
chrome.action.onClicked.addListener((tab) => {
  // Define the URL of the page to open.
  // This should be the main page of your extension.
  const extensionUrl = chrome.runtime.getURL('index.html');

  // Query for existing tabs with the same URL
  chrome.tabs.query({ url: extensionUrl }, (tabs) => {
    if (tabs.length > 0 && tabs[0].id) {
      // If a tab is already open, focus on it
      chrome.tabs.update(tabs[0].id, { active: true });
      // Also focus on the window that contains the tab
      chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      // If no tab is open, create a new one
      chrome.tabs.create({ url: extensionUrl });
    }
  });
});
