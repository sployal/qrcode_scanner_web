// background service worker for QR Scanner extension
// Listens for the command and forwards to the active tab

chrome.commands.onCommand.addListener((command) => {
  if (command === 'scan-qr') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && typeof tabs[0].id !== 'undefined') {
        const tabId = tabs[0].id;
        // Try to send message; if no receiver exists, inject the content script and retry.
        chrome.tabs.sendMessage(tabId, { action: 'activateScanner' }, (res) => {
          if (chrome.runtime.lastError) {
            // Most common reason: receiving end doesn't exist (content script not loaded in this tab)
            console.warn('sendMessage failed, attempting to inject content script:', chrome.runtime.lastError.message);
            chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }, () => {
              if (chrome.runtime.lastError) {
                console.error('Injection of content script failed:', chrome.runtime.lastError.message);
                return;
              }
              // retry sending message once
              chrome.tabs.sendMessage(tabId, { action: 'activateScanner' }, (res2) => {
                if (chrome.runtime.lastError) {
                  console.error('Second sendMessage failed:', chrome.runtime.lastError.message);
                }
              });
            });
          }
        });
      }
    });
  }
});

// Handle content script requests to capture the visible tab and return a data URL
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.action === 'captureVisibleTab') {
    // `captureVisibleTab` requires the extension to be allowed to access the tab.
    // We return the data URL via sendResponse (async) — return true to indicate we'll call sendResponse later.
    const options = { format: 'png' };
    try {
      // If sender.tab is present, use sender.tab.windowId if available
      chrome.tabs.captureVisibleTab(null, options, function (dataUrl) {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ dataUrl });
        }
      });
    } catch (e) {
      sendResponse({ error: e && e.message ? e.message : String(e) });
    }
    return true; // indicate async response
  }
});