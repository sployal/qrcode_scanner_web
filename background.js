// Background service worker for QR Scanner extension

chrome.commands.onCommand.addListener((command) => {
  if (command === 'scan-qr') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && typeof tabs[0].id !== 'undefined') {
        const tabId = tabs[0].id;
        
        chrome.tabs.sendMessage(tabId, { action: 'activateScanner' }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Injecting content script...');
            chrome.scripting.executeScript(
              {
                target: { tabId: tabId },
                files: ['jsQR.js', 'content.js']
              },
              () => {
                if (chrome.runtime.lastError) {
                  console.error('Script injection failed:', chrome.runtime.lastError.message);
                  return;
                }
                
                setTimeout(() => {
                  chrome.tabs.sendMessage(tabId, { action: 'activateScanner' }, (response) => {
                    if (chrome.runtime.lastError) {
                      console.error('Second attempt failed:', chrome.runtime.lastError.message);
                    }
                  });
                }, 100);
              }
            );
          }
        });
      }
    });
  }
});

// Handle screen capture requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.action === 'captureVisibleTab') {
    chrome.tabs.captureVisibleTab(
      null,
      { format: 'png' },
      (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.error('Capture error:', chrome.runtime.lastError);
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ dataUrl: dataUrl });
        }
      }
    );
    return true;
  }
});