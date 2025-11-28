// QR Code Scanner Content Script - Self-contained version
let isSelecting = false;
let startX, startY;
let overlay, selectionBox, cursor;

// Initialize on keyboard shortcut (fallback)
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.shiftKey && e.key && e.key.toLowerCase() === 'q') {
    e.preventDefault();
    activateScanner();
  }
  if (isSelecting && e.key === 'Escape') {
    cancelScanner();
  }
});

function activateScanner() {
  if (isSelecting) return;
  
  createOverlay();
  isSelecting = true;
  document.body.style.cursor = 'crosshair';
}

function createOverlay() {
  overlay = document.createElement('div');
  overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.3); z-index: 2147483647; cursor: none;';
  
  selectionBox = document.createElement('div');
  selectionBox.style.cssText = 'position: fixed; border: 2px dashed #00ff00; background: rgba(0, 255, 0, 0.1); display: none; z-index: 2147483647; pointer-events: none;';
  
  cursor = document.createElement('div');
  cursor.style.cssText = 'position: fixed; width: 40px; height: 40px; pointer-events: none; z-index: 2147483647; transform: translate(-50%, -50%); display: block;';
  cursor.innerHTML = '<svg width="40" height="40" viewBox="0 0 40 40"><line x1="20" y1="0" x2="20" y2="40" stroke="#00ff00" stroke-width="3"/><line x1="0" y1="20" x2="40" y2="20" stroke="#00ff00" stroke-width="3"/><circle cx="20" cy="20" r="12" fill="none" stroke="#00ff00" stroke-width="2"/><circle cx="20" cy="20" r="2" fill="#00ff00"/></svg>';
  
  document.body.appendChild(overlay);
  document.body.appendChild(selectionBox);
  document.body.appendChild(cursor);
  
  overlay.addEventListener('mousemove', onMouseMove);
  overlay.addEventListener('mousedown', onMouseDown);
  overlay.addEventListener('mouseup', onMouseUp);
  overlay.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    cancelScanner();
  });
}

function onMouseMove(e) {
  cursor.style.display = 'block';
  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';
  
  if (isSelecting && startX !== undefined) {
    const currentX = e.clientX;
    const currentY = e.clientY;
    
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    
    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
    selectionBox.style.display = 'block';
  }
}

function onMouseDown(e) {
  if (e.button === 0) {
    startX = e.clientX;
    startY = e.clientY;
  }
}

function onMouseUp(e) {
  if (e.button !== 0) return;
  
  const endX = e.clientX;
  const endY = e.clientY;
  
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  
  if (width > 10 && height > 10) {
    captureAndDecode(left, top, width, height);
  } else {
    cancelScanner();
  }
}

function captureAndDecode(x, y, width, height) {
  showLoadingMessage();
  
  chrome.runtime.sendMessage({ action: 'captureVisibleTab' }, function (response) {
    if (!response) {
      showResult('Error: No response from extension.');
      cancelScanner();
      return;
    }

    if (response.error) {
      showResult('Error capturing screen: ' + response.error);
      cancelScanner();
      return;
    }

    if (response.dataUrl) {
      processCapturedImage(response.dataUrl, x, y, width, height);
    } else {
      showResult('No image captured.');
      cancelScanner();
    }
  });
}

function processCapturedImage(dataUrl, x, y, width, height) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  
  img.onload = function () {
    try {
      const dpr = window.devicePixelRatio || 1;
      
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext('2d');
      
      // Draw the cropped portion
      ctx.drawImage(
        img,
        Math.round(x * dpr),
        Math.round(y * dpr),
        Math.round(width * dpr),
        Math.round(height * dpr),
        0,
        0,
        Math.round(width * dpr),
        Math.round(height * dpr)
      );
      
      // Use jsQR library (bundled with extension)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      if (typeof jsQR !== 'undefined') {
        const code = jsQR(imageData.data, canvas.width, canvas.height, {
          inversionAttempts: "attemptBoth",
        });
        
        if (code && code.data) {
          showResult(code.data);
        } else {
          showResult('No QR code detected. Please try:\n\n• Selecting a larger area around the QR code\n• Ensuring the QR code is clear and in focus\n• Making sure the entire QR code is visible');
        }
      } else {
        showResult('QR decoder library not loaded. Please reload the extension.');
      }
      
      cancelScanner();
      
    } catch (err) {
      console.error('Processing error:', err);
      showResult('Error processing image: ' + err.message);
      cancelScanner();
    }
  };
  
  img.onerror = function (e) {
    console.error('Failed to load image', e);
    showResult('Failed to load captured screenshot.');
    cancelScanner();
  };
  
  img.src = dataUrl;
}

function showLoadingMessage() {
  const loading = document.createElement('div');
  loading.id = 'qr-scanner-loading';
  loading.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px 40px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 2147483647; font-family: Arial, sans-serif; font-size: 16px; color: #333;';
  loading.textContent = 'Scanning QR code...';
  document.body.appendChild(loading);
  
  setTimeout(() => {
    const elem = document.getElementById('qr-scanner-loading');
    if (elem) elem.remove();
  }, 10000);
}

function showResult(text) {
  const loading = document.getElementById('qr-scanner-loading');
  if (loading) loading.remove();
  
  const popup = document.createElement('div');
  popup.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 2147483647; max-width: 500px; min-width: 300px; font-family: Arial, sans-serif;';
  
  const heading = document.createElement('h3');
  heading.style.cssText = 'margin: 0 0 15px 0; color: #333; font-size: 18px;';
  heading.textContent = 'QR Code Result';
  
  const textarea = document.createElement('textarea');
  textarea.readOnly = true;
  textarea.style.cssText = 'width: 100%; min-height: 100px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-family: monospace; font-size: 13px; resize: vertical; box-sizing: border-box; white-space: pre-wrap;';
  textarea.value = text;
  
  const buttonDiv = document.createElement('div');
  buttonDiv.style.cssText = 'margin-top: 15px; display: flex; gap: 10px;';
  
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy to Clipboard';
  copyBtn.style.cssText = 'flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;';
  copyBtn.onmouseover = () => copyBtn.style.background = '#45a049';
  copyBtn.onmouseout = () => copyBtn.style.background = '#4CAF50';
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = 'flex: 1; padding: 10px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;';
  closeBtn.onmouseover = () => closeBtn.style.background = '#da190b';
  closeBtn.onmouseout = () => closeBtn.style.background = '#f44336';
  
  copyBtn.addEventListener('click', function() {
    navigator.clipboard.writeText(text).then(function() {
      copyBtn.textContent = '✓ Copied!';
      copyBtn.style.background = '#2196F3';
      setTimeout(function() {
        popup.remove();
      }, 1000);
    }).catch(function(err) {
      console.error('Copy failed:', err);
      copyBtn.textContent = 'Copy failed';
    });
  });

  // Add "Open Link" button to open decoded QR codes in a new tab
  const openBtn = document.createElement('button');
  openBtn.textContent = 'Open Link';
  openBtn.style.cssText = 'flex: 1; padding: 10px; background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;';
  openBtn.onmouseover = () => openBtn.style.background = '#1976D2';
  openBtn.onmouseout = () => openBtn.style.background = '#2196F3';

  openBtn.addEventListener('click', function() {
    // Trim and normalize the text
    let url = String(text).trim();

    // Quick detection of URL-like text. Accepts http(s), protocol-less hostnames like 'example.com', mailto:, tel:, data: etc.
    const hasProtocol = /^(https?:\/\/|ftp:\/\/|mailto:|tel:|data:|file:|\/\/)/i.test(url);
    const looksLikeDomain = /^([\w-]+\.)+[\w-]{2,}(\/.*)?$/i.test(url);

    if (!hasProtocol) {
      if (looksLikeDomain) {
        url = 'https://' + url; // assume https when it looks like a hostname
      } else {
        // Not a URL we can safely open
        alert('Decoded text is not a valid/known URL: "' + url + '"');
        return;
      }
    }

    try {
      const validated = new URL(url, window.location.href);

      // Open in a new tab (user-initiated click) and close popup shortly after
      window.open(validated.toString(), '_blank', 'noopener,noreferrer');
      openBtn.textContent = 'Opening...';
      setTimeout(() => popup.remove(), 700);
    } catch (err) {
      console.error('Invalid URL', err);
      alert('Unable to open this link: ' + url);
    }
  });
  
  closeBtn.addEventListener('click', function() {
    popup.remove();
  });
  
  buttonDiv.appendChild(copyBtn);
  buttonDiv.appendChild(openBtn);
  buttonDiv.appendChild(closeBtn);
  
  popup.appendChild(heading);
  popup.appendChild(textarea);
  popup.appendChild(buttonDiv);
  
  document.body.appendChild(popup);
  
  textarea.select();
}

function cancelScanner() {
  isSelecting = false;
  document.body.style.cursor = 'default';
  
  if (overlay) overlay.remove();
  if (selectionBox) selectionBox.remove();
  if (cursor) cursor.remove();
  
  const loading = document.getElementById('qr-scanner-loading');
  if (loading) loading.remove();
  
  overlay = null;
  selectionBox = null;
  cursor = null;
  startX = undefined;
  startY = undefined;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'activateScanner') {
    activateScanner();
    sendResponse({ ok: true });
  }
  return true;
});