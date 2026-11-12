# Salesforce & Google Sheet Studio (In-Browser Python Wasm)

A privacy-first, serverless Google Chrome Extension (Manifest V3) running **CPython, NumPy, and Pandas directly in WebAssembly (Pyodide)**. Designed specifically to solve critical data preparation challenges in **Salesforce CRM, Google Sheets, and CSV spreadsheets** without servers or native host processes.

> **100% In-Browser Execution • Zero Server Costs • Complete Enterprise Privacy (Data Never Leaves Your Computer)**

---

## 📂 Repository Folder Structure

```
podman-python/
├── .github/                           # GitHub configuration & CI/CD
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md              # Issue template for bugs
│   │   └── feature_request.md         # Issue template for feature proposals
│   ├── workflows/
│   │   └── ci.yml                     # GitHub Actions CI (validation & packaging)
│   └── pull_request_template.md       # Pull request checklist
│
├── .gitattributes                     # Git line-ending normalization & binary specs
├── .gitignore                         # Python, venv, build & OS file exclusions
├── CONTRIBUTING.md                    # Development, testing, & contributing guidelines
├── LICENSE                            # MIT License
├── README.md                          # Main project documentation & quickstart
│
├── dist/                              # Distribution artifacts directory
│   └── .gitkeep                       # Preserves output folder in Git
│
├── doc/                               # Deep architectural & technical documentation
│   ├── ARCHITECTURE.md                # Component diagrams & data flow
│   ├── BUNDLING_GUIDE.md              # Extension packaging & deployment guide
│   ├── DESIGN.md                      # UI/UX & technical design principles
│   ├── FUNCTIONAL_DETAILS.md          # In-depth breakdown of Python algorithms
│   ├── README.md                      # Index of documentation
│   └── STRUCTURE.md                   # Detailed directory taxonomy
│
├── extension/                         # Chrome Extension Source (Manifest V3)
│   ├── manifest.json                  # Manifest V3 configuration & permissions
│   ├── background/
│   │   └── background.js              # Service worker lifecycle manager
│   ├── content/
│   │   └── content.js                 # In-page extractor & Google Sheets DOM controller
│   ├── icons/                         # Extension icons
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   ├── offscreen/                     # Persistent background Wasm host (instant-load engine)
│   │   ├── offscreen.html
│   │   └── offscreen.js
│   ├── popup/                         # Main extension popup interface
│   │   ├── popup.html                 # UI structure with Salesforce-style modal & tabs
│   │   ├── popup.css                  # Dark-mode styling, responsive tables & modal
│   │   └── popup.js                   # UI logic, sheet bridge & Pyodide orchestrator
│   ├── preview/                       # Standalone widescreen 1080p data viewer
│   │   ├── preview.html
│   │   └── preview.js
│   └── pyodide/                       # Sandboxed WebAssembly execution environment
│       ├── pyodide_runner.js          # CPython/NumPy/Pandas script routines
│       └── sandbox.html               # Sandboxed iframe compliant with MV3 CSP
│
└── scripts/                           # Developer & build automation tools
    ├── bundle_extension.py            # Cross-platform ZIP packager
    ├── bundle-extension.ps1           # PowerShell packager wrapper
    └── download-pyodide.ps1           # Offline Pyodide downloader (optional)
```

---

## 🎯 Key Features & Solved Problems

### 1. 🔑 Salesforce 15-to-18 Character ID Fixer
* **The Problem**: Salesforce exports case-sensitive 15-character IDs (e.g., `0015W00002abCdE` vs `0015W00002abcde`). Spreadsheets (Excel/Google Sheets) use case-insensitive `VLOOKUP`/`XLOOKUP`, corrupting matched rows and breaking CRM imports.
* **The Solution**: Uses the official Salesforce checksum algorithm running in WebAssembly to append 3 case-safe suffix characters.
  * **Single ID Conversion**: Converts individual IDs instantly with 1-click clipboard copy.
  * **Bulk ID Conversion**: Batch-converts hundreds of IDs at once.

### 2. 🧹 Smart Google Sheet & CSV Cleanser
* **The Problem**: Salesforce Data Loader imports and bulk updates fail frequently due to dirty data, untrimmed whitespace, non-standard date formats, and duplicates.
* **The Solution**:
  * **🟢 Open Sheet Auto-Detection**: Automatically identifies the open Google Sheet and reads its contents via secure session-authenticated exports.
  * **📁 Drag-and-Drop CSV**: Drop local `.csv` files directly into the browser.
  * **Whitespace Stripping**: Auto-trims leading/trailing spaces across all text columns.
  * **Date Standardization**: Automatically parses varied date formats into Salesforce ISO format (`YYYY-MM-DD`).
  * **Auto-Convert Salesforce IDs**: Detects ID columns and converts 15-char IDs to 18-char safe IDs.
  * **Deduplication**: Drops duplicate rows and reports metrics.
  * **Quality Audit**: Instant row/column counts, removed duplicates, and modified column tags.
  * **Readable Table Preview**: Auto-adjusts so datasets with $\le 5$ columns render without horizontal scrollbars.
  * **⤢ Fullscreen Modal (Salesforce-Style)**: Expands into an enterprise modal with live search, row filtering, and a standalone 1080p viewer.
  * **➕ Add New Sheet Tab into Existing Spreadsheet**: Clicks the native `+` button in your active spreadsheet to insert a new tab (`Sheet2`, `Sheet3`) and positions your cursor at cell `A1` ready for `Ctrl+V`.
  * **📋 Copy TSV for A1**: Copies cell-preserving tab-separated values to paste into any spreadsheet.
  * **⬇️ Download Cleaned CSV**: Saves sanitized data to disk.

### 3. 📊 NumPy Statistical Profiler & Webpage Scraper
* **The Problem**: Analysts need rapid descriptive statistics without opening bloated desktop software.
* **The Solution**:
  * Instant statistical profiling via NumPy (Mean, Median, Standard Deviation, Variance, Q25, Q75, Skewness, Min, Max).
  * Webpage number scraper to profile prices or values directly from any live webpage.

---

## 🚀 Getting Started in Google Chrome

1. Open **Google Chrome** and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click **Load unpacked** and select the `extension/` directory:
   ```
   C:\Users\vikas\OneDrive\Desktop\Projects\podman\podman-python\extension
   ```
4. Open any Google Spreadsheet, click the extension icon in your browser toolbar, and click **"📥 Read Sheet Data"**!

---

## 📦 Packaging & Building

To generate a store-ready distribution package:

```bash
python scripts/bundle_extension.py
```

The resulting package will be created in:
```
dist/python-in-browser-analytics.zip
```

---

## 🛡️ Enterprise Security & Privacy

* **100% In-Browser Execution**: Uses [Pyodide](https://pyodide.org/) compiled to WebAssembly. Python runs inside the browser's sandbox.
* **Zero Network Uploads**: Your spreadsheet records, customer names, emails, and Salesforce IDs never leave your computer.
* **Full Manifest V3 Compliance**: Strict CSP sandbox isolation with no unsafe external evals in extension contexts.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the [LICENSE](LICENSE) file for details.
