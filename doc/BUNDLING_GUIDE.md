# Chrome Extension Bundling & Distribution Guide

This guide explains how to package and distribute the **Python In-Browser Analytics Chrome Extension**.

---

## 📦 Summary of Bundling Methods

| Method | Target Output | Best For | Build Step Required? |
|---|---|---|---|
| **Method 1: Load Unpacked** | Raw `extension/` directory | Local development & testing | ❌ None |
| **Method 2: ZIP Package** | `dist/python-in-browser-analytics.zip` | Chrome Web Store / Sharing | ✅ 1-click script |
| **Method 3: Packed CRX** | `.crx` binary + `.pem` key | Enterprise self-hosted distribution | ✅ Via Chrome UI |
| **Method 4: Offline Wasm** | Full `.wasm` and `.whl` bundle | Air-gapped / No-CDN environments | ✅ 1-click script |

---

## 🚀 Method 1: Load Unpacked (Development)

1. Open Google Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the folder:
   ```
   C:\Users\vikas\OneDrive\Desktop\Projects\podman\podman-python\extension
   ```
4. Click the extension icon in your Chrome toolbar to test.

---

## 📦 Method 2: Automated ZIP Bundler (Chrome Web Store)

To produce a clean, store-ready `.zip` archive:

```powershell
python scripts\bundle_extension.py
```

### Output:
```
dist/python-in-browser-analytics.zip
```
This `.zip` file is ready to be uploaded directly to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## 🔒 Method 3: Pack Extension as `.crx`

1. Open `chrome://extensions/` in Chrome.
2. Enable **Developer mode**.
3. Click **Pack extension**.
4. Set **Extension root directory** to:
   ```
   C:\Users\vikas\OneDrive\Desktop\Projects\podman\podman-python\extension
   ```
5. Leave **Private key file** blank and click **Pack Extension**.

---

## 🌐 Method 4: Offline Pyodide WebAssembly Packaging

To package the extension with all Pyodide WebAssembly files bundled locally for air-gapped environments:

1. Download the offline WebAssembly binaries:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\download-pyodide.ps1
   ```
2. Bundle the extension:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\bundle-extension.ps1 -IncludeWasmOffline
   ```
