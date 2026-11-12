# System Architecture

This document describes the WebAssembly in-browser architecture, execution model, sandboxing, and communication flow.

---

## 🏛️ High-Level WebAssembly Architecture

```mermaid
flowchart TD
    subgraph BrowserContext["Chrome Browser Execution Context"]
        subgraph ExtensionContext["Extension Context (Strict CSP)"]
            UI["Extension Popup (popup.js)"]
            SW["Background Service Worker (background.js)"]
            CS["Content Script (content.js)"]
            DOM["Active Web Page DOM"]
        end

        subgraph SandboxContext["Sandboxed Frame (Relaxed CSP: 'wasm-unsafe-eval')"]
            IFrame["sandbox.html"]
            Runner["pyodide_runner.js"]
            Pyodide["Pyodide WebAssembly Engine"]
            subgraph WasmModules["Wasm Python Modules"]
                CPython["CPython 3.11 Runtime"]
                NumPy["NumPy WebAssembly Module"]
                Pandas["Pandas WebAssembly Module"]
            end
        end
    end

    DOM <-->|DOM Extraction| CS
    CS <-->|chrome.tabs.sendMessage| UI
    UI <-->|HTML5 window.postMessage| IFrame
    IFrame --> Runner
    Runner --> Pyodide
    Pyodide --> CPython
    CPython --> NumPy
    CPython --> Pandas
```

---

## 🔒 Security Model & Manifest V3 Sandboxing

### The Manifest V3 Challenge

Google Chrome's Manifest V3 enforces a strict Content Security Policy (CSP):

- Extensions cannot execute arbitrary string code or load dynamic remote scripts into their main context.
- Heavy numerical code execution (JIT / Wasm) inside the popup can block the UI thread.

### The Sandboxed Solution

To comply with Manifest V3 while running full CPython:

1. **Dedicated Sandbox Page**:

   ```json
   "sandbox": {
     "pages": ["pyodide/sandbox.html"]
   },
   "content_security_policy": {
     "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
     "sandbox": "sandbox allow-scripts allow-forms; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net; object-src 'self'"
   }
   ```

2. **Process & Memory Isolation**:
   - `sandbox.html` has no direct access to Chrome Extension APIs (`chrome.tabs`, `chrome.storage`), minimizing attack surfaces.
   - It communicates exclusively via `window.postMessage` with strict `origin` checks.
   - All Python data processing happens in memory on the client's device. No data is transmitted externally.

---

## 🔄 Sequence Diagram: End-to-End Calculation

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Popup as popup.js
    participant Frame as sandbox.html (pyodide_runner.js)
    participant Wasm as Pyodide (CPython / NumPy / Pandas)

    User->>Popup: Clicks "Calculate Stats (NumPy)"
    Popup->>Popup: Format payload & generate unique message ID
    Popup->>Frame: window.postMessage({target: "PYODIDE_SANDBOX", id, action: "statistics", payload})
    Frame->>Wasm: pyodide.runPythonAsync("py_stats(temp_input_numbers)")
    Wasm->>Wasm: Vectorized calculations in WebAssembly memory
    Wasm-->>Frame: Return Python dict / JS object
    Frame->>Popup: window.parent.postMessage({source: "PYODIDE_SANDBOX", id, success: true, data})
    Popup->>Popup: Render metric cards (mean, median, variance, std dev, quartiles)
    Popup-->>User: Instant visual feedback
```
