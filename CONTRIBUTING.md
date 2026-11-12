# Contributing to Salesforce & Google Sheet Studio

Thank you for your interest in contributing to **Salesforce & Google Sheet Studio**! This project provides serverless, client-side data cleansing and Salesforce ID transformation running completely in Google Chrome via Pyodide WebAssembly.

---

## 🛠️ Development Setup

### Prerequisites
* **Google Chrome** (v109+ recommended for Manifest V3 WebAssembly support)
* **Python 3.10+** (for running bundling scripts and local testing)
* **Git** installed on your machine

### Cloning the Repository
```bash
git clone <repository-url>
cd podman-python
```

### Loading Extension into Chrome
1. Navigate to `chrome://extensions/` in Google Chrome.
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click **Load unpacked**.
4. Select the `extension/` directory from this repository.

---

## 📁 Repository Structure Overview

* **`extension/`**: The complete unpacked Chrome Extension (Manifest V3).
  * `manifest.json`: Extension configuration and permissions.
  * `popup/`: Primary UI popup (`popup.html`, `popup.css`, `popup.js`).
  * `content/`: Webpage integration script (`content.js`).
  * `background/`: Background service worker (`background.js`).
  * `pyodide/`: WebAssembly sandboxed runtime (`sandbox.html`, `pyodide_runner.js`).
  * `preview/`: Standalone widescreen dataset viewer (`preview.html`, `preview.js`).
  * `icons/`: Extension icons (16px, 48px, 128px).
* **`scripts/`**: Utility scripts for bundling and Pyodide management.
  * `bundle_extension.py`: Cross-platform ZIP packager for Chrome Web Store distribution.
  * `bundle-extension.ps1`: PowerShell wrapper for bundling.
* **`doc/`**: Deep architecture, design, and functional documentation.
* **`.github/`**: GitHub Actions workflows and issue/PR templates.

---

## 📦 Building the Production ZIP Archive

Whenever changes are made to the extension, bundle a store-ready archive by running:

```bash
python scripts/bundle_extension.py
```
Or on Windows PowerShell:
```powershell
.\scripts\bundle-extension.ps1
```

The output ZIP file will be placed in `dist/python-in-browser-analytics.zip`.

---

## 🧪 Testing Your Changes

1. **Popup & UI**: Click the extension icon in Chrome and verify UI tabs, theme styling, and spinner initialization.
2. **Salesforce 15-to-18 Conversion**:
   * Single ID: Test `0015W00002484jZ` -> `0015W00002484jZQAQ`.
   * Bulk ID: Test multi-line inputs.
3. **Google Sheet Integration**:
   * Open an active Google Spreadsheet (`docs.google.com/spreadsheets/d/...`).
   * Verify detection, reading via `gviz`, in-popup preview table, and the Salesforce-style Fullscreen Modal.
   * Test **"➕ Add New Sheet Tab into Spreadsheet"** to ensure it creates `Sheet2` or `Sheet3` directly within the active spreadsheet.

---

## 🔀 Branching & Pull Request Guidelines

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Write clean, readable code following standard JavaScript and Python style conventions.
3. Ensure no local virtual environment directories (`venv/`) or temporary files are committed.
4. Commit your changes with clear semantic messages:
   ```bash
   git commit -m "feat(gsheet): improve new sheet tab insertion selector"
   ```
5. Open a Pull Request referencing the issue or feature you worked on.
