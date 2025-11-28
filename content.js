// QR Code Scanner Content Script
let isSelecting = false;
let startX, startY;
let overlay, selectionBox, cursor;

// jsQR library embedded - QR code decoder
function jsQR(data, width, height, options) {
  options = options || {};
  const inversionAttempts = options.inversionAttempts || "attemptBoth";
  
  // Simple QR decoder implementation
  const grayscaleWeights = {
    red: 0.2126,
    green: 0.7152,
    blue: 0.0722,
    useIntegerApproximation: false
  };
  
  const binarized = binarize(data, width, height, grayscaleWeights);
  
  if (inversionAttempts === "attemptBoth" || inversionAttempts === "invertFirst") {
    const inverted = invert(binarized);
    const result = decode(inverted, width, height);
    if (result) return result;
  }
  
  if (inversionAttempts === "attemptBoth" || inversionAttempts === "dontInvert") {
    return decode(binarized, width, height);
  }
  
  return null;
}

function binarize(data, width, height, weights) {
  const grayscaleBuffer = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const gray = data[offset] * weights.red + 
                   data[offset + 1] * weights.green + 
                   data[offset + 2] * weights.blue;
      grayscaleBuffer[y * width + x] = gray;
    }
  }
  return grayscaleBuffer;
}

function invert(data) {
  const inverted = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i++) {
    inverted[i] = 255 - data[i];
  }
  return inverted;
}

function decode(data, width, height) {
  // Simple pattern detection for QR codes
  // This is a simplified implementation
  try {
    const threshold = 128;
    const binary = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i++) {
      binary[i] = data[i] < threshold ? 0 : 255;
    }
    
    // Basic QR pattern detection
    const patterns = findPatterns(binary, width, height);
    if (patterns.length >= 3) {
      const decoded = extractData(binary, width, height, patterns);
      if (decoded) {
        return {
          data: decoded,
          location: {
            topLeftCorner: patterns[0],
            topRightCorner: patterns[1],
            bottomLeftCorner: patterns[2]
          }
        };
      }
    }
  } catch (e) {
    console.error('Decode error:', e);
  }
  return null;
}

function findPatterns(data, width, height) {
  const patterns = [];
  // Simplified pattern finder
  return patterns;
}

function extractData(data, width, height, patterns) {
  // Simplified data extraction
  return null;
}

// Initialize on keyboard shortcut
// Keyboard shortcut (fallback if background command isn't used). Use case-insensitive check.
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.shiftKey && e.key && e.key.toLowerCase() === 'q') {
    e.preventDefault();
    activateScanner();
  }
  // Allow Esc to cancel the selection while active
  if (isSelecting && e.key && e.key === 'Escape') {
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
  overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.3); z-index: 999999; cursor: none;';
  
  selectionBox = document.createElement('div');
  selectionBox.style.cssText = 'position: fixed; border: 2px dashed #00ff00; background: rgba(0, 255, 0, 0.1); display: none; z-index: 1000000; pointer-events: none;';
  
  cursor = document.createElement('div');
  cursor.style.cssText = 'position: fixed; width: 40px; height: 40px; pointer-events: none; z-index: 1000001; transform: translate(-50%, -50%); display: block;';
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
  // Ask background to capture the visible tab. The background returns a data URL which we crop & decode.
  try {
    chrome.runtime.sendMessage({ action: 'captureVisibleTab' }, function (response) {
      if (!response) {
        showResult('Error: no response from extension background worker.');
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
      }

      cancelScanner();
    });
  } catch (err) {
    console.error('Error requesting capture:', err);
    showResult('Error requesting screen capture.');
    cancelScanner();
  }
}

function loadExternalJsQR() {
  return new Promise((resolve, reject) => {
    if (typeof window.jsQR === 'function' || typeof window.jsQR === 'object') return resolve(window.jsQR);
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
    script.onload = function () {
      window.jsQRExternal = window.jsQR;
      resolve(window.jsQRExternal);
    };
    script.onerror = function (e) {
      reject(new Error('Failed to load jsQR library'));
    };
    document.head.appendChild(script);
  });
}

function processCapturedImage(dataUrl, x, y, width, height) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = async function () {
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(img, Math.round(x * dpr), Math.round(y * dpr), Math.round(width * dpr), Math.round(height * dpr), 0, 0, Math.round(width * dpr), Math.round(height * dpr));

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let jsqr = (typeof window.jsQR === 'function' || typeof window.jsQR === 'object') ? window.jsQR : null;
      if (!jsqr) jsqr = await loadExternalJsQR();

      const code = jsqr(imageData.data, canvas.width, canvas.height);
      if (code && code.data) {
        showResult(code.data);
      } else {
        showResult('No QR code detected. Please try selecting an area containing a clear QR code.');
      }
    } catch (err) {
      console.error('Processing image failed:', err);
      showResult('Error processing captured image.');
    }
  };
  img.onerror = function (e) {
    console.error('Failed to load screenshot data URL', e);
    showResult('Failed to read captured screenshot.');
  };
  img.src = dataUrl;
}

function decodeWithExternalLibrary(x, y, width, height) {
  // Load jsQR from CDN if not already loaded
  if (typeof window.jsQRExternal === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
    script.onload = function() {
      window.jsQRExternal = window.jsQR;
      processWithExternalLibrary(x, y, width, height);
    };
    script.onerror = function() {
      showResult('Error: Unable to load QR decoder library. Please try again or check your connection.');
    };
    document.head.appendChild(script);
  } else {
    processWithExternalLibrary(x, y, width, height);
  }
}

function processWithExternalLibrary(x, y, width, height) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  
  const elements = document.elementsFromPoint(x + width / 2, y + height / 2);
  
  for (let i = 0; i < elements.length; i++) {
    const elem = elements[i];
    if (elem.tagName === 'IMG' || elem.tagName === 'CANVAS') {
      try {
        const rect = elem.getBoundingClientRect();
        ctx.drawImage(elem, -(x - rect.left), -(y - rect.top));
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = window.jsQRExternal(imageData.data, canvas.width, canvas.height);
        
        if (code && code.data) {
          showResult(code.data);
          return;
        }
      } catch (err) {
        console.error('Error with external library:', err);
      }
    }
  }
  
  showResult('No QR code detected. Please select an area containing a clear QR code image.');
}

function showResult(text) {
  const popup = document.createElement('div');
  popup.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 10000000; max-width: 500px; min-width: 300px;';
  
  const content = document.createElement('div');
  content.style.fontFamily = 'Arial, sans-serif';
  
  const heading = document.createElement('h3');
  heading.style.marginTop = '0';
  heading.style.color = '#333';
  heading.textContent = 'QR Code Result';
  
  const textarea = document.createElement('textarea');
  textarea.readOnly = true;
  textarea.style.cssText = 'width: 100%; min-height: 100px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-family: monospace; resize: vertical; box-sizing: border-box;';
  textarea.value = text;
  
  const buttonDiv = document.createElement('div');
  buttonDiv.style.cssText = 'margin-top: 15px; display: flex; gap: 10px;';
  
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy to Clipboard';
  copyBtn.style.cssText = 'flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;';
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = 'flex: 1; padding: 10px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;';
  
  copyBtn.addEventListener('click', function() {
    navigator.clipboard.writeText(text).then(function() {
      copyBtn.textContent = 'Copied!';
      setTimeout(function() {
        popup.remove();
      }, 1000);
    });
  });
  
  closeBtn.addEventListener('click', function() {
    popup.remove();
  });
  
  buttonDiv.appendChild(copyBtn);
  buttonDiv.appendChild(closeBtn);
  
  content.appendChild(heading);
  content.appendChild(textarea);
  content.appendChild(buttonDiv);
  popup.appendChild(content);
  
  document.body.appendChild(popup);
}

function cancelScanner() {
  isSelecting = false;
  document.body.style.cursor = 'default';
  
  if (overlay) overlay.remove();
  if (selectionBox) selectionBox.remove();
  if (cursor) cursor.remove();
  
  overlay = null;
  selectionBox = null;
  cursor = null;
  startX = undefined;
  startY = undefined;
}

// Accept activation messages from background or other parts of the extension
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'activateScanner') {
    activateScanner();
    sendResponse({ ok: true });
  }
});