# Functional Details & Workflows

This document details the functional workflows and step-by-step lifecycles of all features in the in-browser Pyodide WebAssembly extension.

---

## 🔄 Workflow 1: NumPy Statistical Computing

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Popup as popup.html / popup.js
    participant Frame as sandbox.html (pyodide_runner.js)
    participant NumPy as NumPy Module (WebAssembly)

    User->>Popup: Enters comma-separated numbers & clicks "Calculate Stats"
    Popup->>Popup: Validates input & converts to float array
    Popup->>Frame: postMessage({action: "statistics", numbers})
    Frame->>NumPy: np.array(numbers, dtype=float)
    NumPy-->>Frame: Return count, sum, mean, median, std_dev, variance, min, max, q25, q75, skewness
    Frame-->>Popup: postMessage({success: true, data})
    Popup->>Popup: Render metric cards
    Popup-->>User: Displays statistical summary
```

---

## 🔄 Workflow 2: Pandas Tabular Analysis

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Popup as popup.html / popup.js
    participant Frame as sandbox.html (pyodide_runner.js)
    participant Pandas as Pandas Module (WebAssembly)

    User->>Popup: Clicks "Run Sample Pandas Analysis"
    Popup->>Frame: postMessage({action: "dataframe", records: [...], group_by: "product"})
    Frame->>Pandas: pd.DataFrame(records)
    Pandas-->>Frame: df.describe(), df.groupby(), df.dtypes
    Frame-->>Popup: postMessage({success: true, data})
    Popup->>Popup: Render JSON in code viewer
    Popup-->>User: Displays dimensions, summary stats & grouped means
```

---

## 🔄 Workflow 3: Webpage Data Scraping & Analysis

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Popup as popup.html / popup.js
    participant CS as content.js (Active Tab)
    participant Frame as sandbox.html (pyodide_runner.js)

    User->>Popup: Clicks "Extract & Analyze Page Numbers"
    Popup->>CS: chrome.tabs.sendMessage({action: "EXTRACT_NUMBERS"})
    CS->>CS: Regex scan document.body.innerText for numbers
    CS-->>Popup: Return array of parsed numbers
    Popup->>Frame: postMessage({action: "statistics", numbers: numbers.slice(0, 500)})
    Frame-->>Popup: Return NumPy statistical calculations
    Popup->>Popup: Render webpage metrics grid
    Popup-->>User: Displays instant summary of active webpage numbers
```
