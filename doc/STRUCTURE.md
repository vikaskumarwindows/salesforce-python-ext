# Project Structure

This document details the file hierarchy and component responsibilities for the in-browser Pyodide WebAssembly extension.

---

## 📂 Complete Directory Tree

```
podman-python/
│
├── extension/                        # Google Chrome Extension (Manifest V3)
│   ├── manifest.json                 # Manifest declaration, permissions & CSP sandbox
│   ├── icons/                        # Application icons
│   │   ├── icon16.png                # 16x16 icon (toolbar & favicon)
│   │   ├── icon48.png                # 48x48 icon (extensions manager)
│   │   └── icon128.png               # 128x128 icon (installation / Web Store)
│   ├── popup/                        # Popup user interface
│   │   ├── popup.html                # UI layout & tabs (Data Analysis, Page Scrape)
│   │   ├── popup.css                 # Dark-mode styling
│   │   └── popup.js                  # UI event handlers & postMessage bridge
│   ├── pyodide/                      # In-Browser WebAssembly Python Engine
│   │   ├── sandbox.html              # Sandboxed iframe executing Wasm CPython
│   │   └── pyodide_runner.js         # Pyodide runtime loader, NumPy & Pandas runner
│   ├── background/                   # Background execution
│   │   └── background.js             # Service worker handling lifecycle events
│   └── content/                      # Content Script
│       └── content.js                # DOM scraper extracting numbers from web pages
│
├── scripts/                          # Build & Packaging Utilities
│   ├── bundle_extension.py           # Cross-platform ZIP bundler
│   ├── bundle-extension.ps1          # PowerShell bundler wrapper
│   └── download-pyodide.ps1          # Offline WebAssembly asset downloader
│
├── dist/                             # Build Output
│   └── python-in-browser-analytics.zip # Store-ready extension package
│
├── doc/                              # Technical Documentation
│   ├── README.md                     # Documentation hub
│   ├── ARCHITECTURE.md               # Architecture & WebAssembly execution
│   ├── DESIGN.md                     # Design patterns & message contracts
│   ├── FUNCTIONAL_DETAILS.md         # Step-by-step workflow specifications
│   ├── BUNDLING_GUIDE.md             # Packaging & store publishing guide
│   └── STRUCTURE.md                  # This document
│
└── README.md                         # Main project overview
```

---

## 🔍 Component Breakdown

### 1. `extension/pyodide/`
- **`sandbox.html`**: A designated sandboxed page allowed by Manifest V3 to execute WebAssembly code (`'wasm-unsafe-eval'`).
- **`pyodide_runner.js`**:
  - Dynamically initializes the Pyodide WebAssembly CPython runtime.
  - Loads the compiled `numpy` and `pandas` WebAssembly packages.
  - Listens for messages dispatched from `popup.js`, executes Python calculations, and replies asynchronously.

### 2. `extension/popup/`
- **`popup.html`**: Tabbed interface featuring:
  - **Data Analysis**: Input textarea for numeric calculations, instant descriptive metrics grid, and Pandas DataFrame sample analysis.
  - **Page Scrape**: Extracts numbers from the user's active browser tab and profiles them with NumPy.
- **`popup.css`**: Complete responsive dark-mode styling with CSS Grid cards.
- **`popup.js`**: Connects the popup UI with the sandboxed `pyodideFrame` using asynchronous `window.postMessage`.

### 3. `scripts/`
- **`bundle_extension.py`**: Cleanly packages the extension into `dist/python-in-browser-analytics.zip`, omitting OS clutter.
- **`download-pyodide.ps1`**: Downloads the offline `.wasm`, `.whl`, and stdlib assets for completely air-gapped deployments.
