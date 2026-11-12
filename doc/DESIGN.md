# Software Design Document

This document outlines the software design patterns, message contract schemas, data structures, and component architecture for the in-browser Pyodide WebAssembly extension.

---

## 📐 Design Patterns

### 1. Asynchronous Message Broker Pattern (`postMessage`)
Communication between `popup.js` and `pyodide_runner.js` implements a request-response broker pattern using correlation IDs:

```javascript
// Request:
function sendPyodide(action, payload = {}) {
  return new Promise((resolve, reject) => {
    const id = ++messageCounter;
    pyodidePendingCallbacks.set(id, (res) => {
      if (res.success) resolve(res.data);
      else reject(new Error(res.error || "Pyodide execution error"));
    });

    pyodideFrame.contentWindow.postMessage(
      { target: "PYODIDE_SANDBOX", id, action, payload },
      "*"
    );
  });
}
```

### 2. Micro-Kernel Architecture (Pyodide Wasm Engine)
The Python engine inside `pyodide_runner.js` acts as a micro-kernel:
- Core kernel: CPython 3.11 compiled to WebAssembly.
- Dynamic modules: `numpy.whl` and `pandas.whl` loaded on demand into Wasm memory.
- Python execution routines: Pre-compiled helper functions (`py_stats`, `py_dataframe`) invoked via `runPythonAsync`.

---

## 📄 Message Contracts & Schemas

### 1. Action: `statistics` (NumPy Engine)
- **Request:**
  ```json
  {
    "target": "PYODIDE_SANDBOX",
    "id": 1,
    "action": "statistics",
    "payload": {
      "numbers": [10.5, 23.4, 56.1, 88.0, 42.7, 19.3, 77.2]
    }
  }
  ```
- **Response:**
  ```json
  {
    "source": "PYODIDE_SANDBOX",
    "id": 1,
    "success": true,
    "data": {
      "count": 7,
      "sum": 317.2,
      "mean": 45.31,
      "median": 42.7,
      "std_dev": 28.52,
      "variance": 813.43,
      "min": 10.5,
      "max": 88.0,
      "q25": 21.35,
      "q75": 66.65,
      "skewness": 0.28
    }
  }
  ```

---

### 2. Action: `dataframe` (Pandas Engine)
- **Request:**
  ```json
  {
    "target": "PYODIDE_SANDBOX",
    "id": 2,
    "action": "dataframe",
    "payload": {
      "records": [
        { "product": "Widget A", "sales": 120, "revenue": 2400 },
        { "product": "Widget B", "sales": 85,  "revenue": 1700 },
        { "product": "Widget A", "sales": 150, "revenue": 3000 }
      ],
      "group_by": "product"
    }
  }
  ```
- **Response:**
  ```json
  {
    "source": "PYODIDE_SANDBOX",
    "id": 2,
    "success": true,
    "data": {
      "shape": { "rows": 3, "columns": 3 },
      "columns": ["product", "sales", "revenue"],
      "missing_values": { "product": 0, "sales": 0, "revenue": 0 },
      "dtypes": { "product": "object", "sales": "int64", "revenue": "int64" },
      "numeric_summary": { ... },
      "grouped_by_mean": [
        { "product": "Widget A", "sales": 135.0, "revenue": 2700.0 },
        { "product": "Widget B", "sales": 85.0,  "revenue": 1700.0 }
      ],
      "preview": [ ... ]
    }
  }
  ```

---

## 🎨 Frontend UI Component Design

- **State Indicator**: Real-time status badge (`Starting Pyodide...`, `Pyodide Wasm Ready`, `Error`).
- **Tabbed Layout**: Tab transitions are managed purely via CSS classes (`tab-btn.active`, `tab-pane.active`) with zero DOM rebuilding.
- **Metrics Display**: Responsive CSS Grid (`.metrics-grid`) that cleanly formats two columns of computed mathematical metrics.
