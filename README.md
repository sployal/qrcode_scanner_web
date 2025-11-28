# QR Code Scanner (PC Web Extension)

Scan QR codes on any webpage instantly using a simple keyboard shortcut.

## Features

- **Scan any QR code** visible on a webpage.
- **Quick activation** with `Ctrl+Shift+Q` (or `Command+Shift+Q` on Mac).
- **No external uploads** – all processing is done locally in your browser.
- **Works on all sites**.

## Setup

1. Open your browser’s **Extensions** page.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this extension’s folder.


<p align="center">
	<img src="images/image%201.png" alt="Screenshot showing how to enable Developer Mode and load the unpacked extension in the browser extensions page" />
</p>
<p align="center"><em>Figure 1: Enable Developer Mode and load the extension</em></p>

## Usage

- Press `Ctrl+Shift+Q` (or `Command+Shift+Q` on Mac) on any webpage.
- Select the area containing the QR code.
- The extension will decode and display the QR code’s content.


<p align="center">
	<img src="images/image%202.png" alt="Screenshot showing the QR code scanner overlay and selection box on a webpage" />
</p>
<p align="center"><em>Figure 2: QR code scanner overlay in action</em></p>

## Permissions

- **activeTab** and **scripting**: Required to scan and decode QR codes on the current page.

## Keyboard Shortcut

- **Windows/Linux:** `Ctrl+Shift+Q`
- **Mac:** `Command+Shift+Q`

## Credits

- Uses [jsQR](https://github.com/cozmo/jsQR) for QR code decoding.
