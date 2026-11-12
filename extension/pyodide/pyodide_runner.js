/**
 * Pyodide WebAssembly Runner (In-Browser CPython)
 * Runs NumPy, Pandas, Salesforce Data Utilities, and Google Sheet Cleaners entirely inside browser memory.
 */

let pyodideInstance = null;
let initPromise = null;

const PYODIDE_CDN_BASE = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";

const PYTHON_BOOTSTRAP_CODE = `
import io
import re
import csv
import numpy as np
import pandas as pd
import json

# --- 1. Salesforce 15 to 18 Character ID Conversion ---
SF_LOOKUP_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ012345'

def convert_single_sf_id(sf15):
    if not isinstance(sf15, str):
        return sf15
    sf15 = sf15.strip()
    if len(sf15) == 18:
        return sf15
    if len(sf15) != 15:
        return sf15
    
    suffix = ''
    for i in range(3):
        block = sf15[i*5 : (i+1)*5]
        val = 0
        for j, c in enumerate(block):
            if 'A' <= c <= 'Z':
                val += (1 << j)
        suffix += SF_LOOKUP_CHARS[val]
    return sf15 + suffix

def py_convert_sf_ids(ids_list):
    results = []
    for raw_id in ids_list:
        raw_id = str(raw_id).strip()
        if not raw_id:
            continue
        converted = convert_single_sf_id(raw_id)
        results.append({
            "original": raw_id,
            "converted": converted,
            "was_converted": len(raw_id) == 15 and len(converted) == 18,
            "is_valid": len(converted) == 18
        })
    return results

# --- 2. Smart CSV & Google Sheet Data Cleanser ---
def py_clean_csv(csv_text, options=None):
    if options is None:
        options = {}
    
    clean_whitespace = options.get("trim_whitespace", True)
    fix_dates = options.get("standardize_dates", True)
    convert_ids = options.get("convert_sf_ids", True)
    drop_dupes = options.get("drop_duplicates", False)
    dupe_col = options.get("duplicate_column", None)

    # Determine delimiter (comma vs tab) automatically
    sample = csv_text[:4096]
    delimiter = '\t' if ('\t' in sample and sample.count('\t') > sample.count(',')) else ','

    try:
        df = pd.read_csv(io.StringIO(csv_text), sep=delimiter)
    except Exception:
        df = pd.read_csv(io.StringIO(csv_text), sep=None, engine='python')

    initial_rows = len(df)
    initial_cols = len(df.columns)

    audit = {
        "initial_rows": int(initial_rows),
        "initial_cols": int(initial_cols),
        "columns": list(df.columns),
        "whitespace_trimmed_cols": [],
        "dates_standardized_cols": [],
        "sf_ids_converted_cols": [],
        "duplicates_removed": 0,
        "missing_values": df.isnull().sum().to_dict(),
    }

    # 1. Trim whitespace on string columns
    if clean_whitespace:
        for col in df.select_dtypes(include=['object']).columns:
            df[col] = df[col].astype(str).str.strip()
            df[col] = df[col].replace('nan', '')
            audit["whitespace_trimmed_cols"].append(col)

    # 2. Detect and Convert Salesforce 15-char ID columns
    if convert_ids:
        for col in df.columns:
            sample_vals = df[col].dropna().astype(str).head(10).tolist()
            if sample_vals and any(len(v) == 15 and re.match(r'^[a-zA-Z0-9]{15}$', v) for v in sample_vals):
                df[col] = df[col].apply(lambda x: convert_single_sf_id(str(x)) if pd.notnull(x) and len(str(x).strip()) == 15 else x)
                audit["sf_ids_converted_cols"].append(col)

    # 3. Standardize Date columns to user-selected format
    if fix_dates:
        target_fmt = options.get("target_date_format", "YYYY-MM-DD")

        fmt_code_map = {
            "YYYY-MM-DD": "%Y-%m-%d",
            "DD/MM/YYYY": "%d/%m/%Y",
            "MM/DD/YYYY": "%m/%d/%Y",
            "DD-MMM-YYYY": "%d-%b-%Y",
            "YYYY/MM/DD": "%Y/%m/%d",
            "MM-DD-YYYY": "%m-%d-%Y",
            "DD.MM.YYYY": "%d.%m.%Y",
            "YYYY-MM-DD HH:MM:SS": "%Y-%m-%d %H:%M:%S",
        }
        fmt_code = fmt_code_map.get(target_fmt, "%Y-%m-%d")

        def detect_column_dayfirst(series):
            sample = series.dropna().astype(str).str.strip().tolist()[:50]
            for s in sample:
                m = re.match(r'^(\\d{1,2})[/.-](\\d{1,2})[/.-](\\d{2,4})', s)
                if m:
                    n1, n2 = int(m.group(1)), int(m.group(2))
                    if n1 > 12 and n2 <= 12:
                        return True
                    if n2 > 12 and n1 <= 12:
                        return False
            return False

        def is_date_column(series, col_name):
            col_lower = str(col_name).lower()
            date_keywords = ['date', 'time', 'created', 'closed', 'birth', 'due', 'expiry', 'expir', 'updated', 'hired', 'joined', 'effective', 'period', 'schedule', 'timestamp', 'dob', 'day']
            if any(k in col_lower for k in date_keywords):
                return True
            sample = series.dropna().astype(str).str.strip().tolist()
            sample = [s for s in sample if s and s.lower() not in ['nan', 'none', 'null', 'na', '']][:20]
            if not sample:
                return False
            date_matches = 0
            for s in sample:
                if re.match(r'^\\d+(\\.\\d+)?$', s):
                    continue
                if re.search(r'\\b\\d{1,4}[/.-]\\d{1,2}[/.-]\\d{1,4}\\b', s) or re.search(r'\\b[A-Za-z]{3,9}\\b', s):
                    try:
                        if re.match(r'^\\d{4}[-/]', s):
                            pd.to_datetime(s, format='ISO8601')
                        else:
                            try:
                                pd.to_datetime(s)
                            except Exception:
                                pd.to_datetime(s, dayfirst=True)
                        date_matches += 1
                    except Exception:
                        pass
            return date_matches >= max(2, int(len(sample) * 0.4))

        def format_date_cell(val, day_first):
            if pd.isnull(val):
                return val
            s = str(val).strip().strip('"\'')
            if not s or s.lower() in ['nan', 'none', 'null', 'na', '']:
                return val
            if re.match(r'^\\d+(\\.\\d+)?$', s):
                return val
            try:
                if re.match(r'^\\d{4}[-/]', s):
                    dt = pd.to_datetime(s, format='ISO8601')
                else:
                    try:
                        dt = pd.to_datetime(s, dayfirst=day_first)
                    except Exception:
                        dt = pd.to_datetime(s)
                return dt.strftime(fmt_code)
            except Exception:
                return val

        for col in df.columns:
            if is_date_column(df[col], col):
                try:
                    col_df = detect_column_dayfirst(df[col])
                    df[col] = df[col].apply(lambda v: format_date_cell(v, col_df))
                    audit["dates_standardized_cols"].append(f"{col} -> {target_fmt}")
                except Exception:
                    pass

    # 4. Deduplication
    if drop_dupes:
        if dupe_col and dupe_col in df.columns:
            before_count = len(df)
            df = df.drop_duplicates(subset=[dupe_col], keep='first')
            audit["duplicates_removed"] = int(before_count - len(df))
        else:
            before_count = len(df)
            df = df.drop_duplicates(keep='first')
            audit["duplicates_removed"] = int(before_count - len(df))

    audit["final_rows"] = int(len(df))
    audit["preview"] = df.head(8).to_dict(orient="records")

    # Generate CSV string output
    csv_buf = io.StringIO()
    df.to_csv(csv_buf, index=False)
    cleaned_csv_str = csv_buf.getvalue()

    # Generate TSV (Tab-Separated) string output - perfect for pasting back into Google Sheets cells!
    tsv_buf = io.StringIO()
    df.to_csv(tsv_buf, sep='\\t', index=False)
    cleaned_tsv_str = tsv_buf.getvalue()

    return {
        "audit": audit,
        "cleaned_csv": cleaned_csv_str,
        "cleaned_tsv": cleaned_tsv_str
    }

# --- 3. NumPy Statistics ---
def py_stats(numbers):
    arr = np.array(numbers, dtype=float)
    s = pd.Series(arr)
    return {
        "count": int(len(arr)),
        "sum": float(np.sum(arr)),
        "mean": float(np.mean(arr)),
        "median": float(np.median(arr)),
        "std_dev": float(np.std(arr, ddof=1)) if len(arr) > 1 else 0.0,
        "variance": float(np.var(arr, ddof=1)) if len(arr) > 1 else 0.0,
        "min": float(np.min(arr)),
        "max": float(np.max(arr)),
        "q25": float(np.percentile(arr, 25)),
        "q75": float(np.percentile(arr, 75)),
        "skewness": float(s.skew()) if len(arr) > 2 else 0.0
    }
`;

async function initPyodideSandbox() {
  if (pyodideInstance) return pyodideInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (typeof loadPyodide === "undefined") {
        try {
          await loadScript("./pyodide.js");
        } catch {
          await loadScript(`${PYODIDE_CDN_BASE}pyodide.js`);
        }
      }

      let indexURL = "./";
      try {
        const testLocal = await fetch("./pyodide-lock.json", { method: "HEAD" });
        if (!testLocal.ok) indexURL = PYODIDE_CDN_BASE;
      } catch {
        indexURL = PYODIDE_CDN_BASE;
      }

      notifyParent({ status: "loading", message: "Starting CPython 3.12 WebAssembly..." });

      const py = await loadPyodide({ indexURL });

      notifyParent({ status: "loading", message: "Loading NumPy & Pandas packages..." });

      await py.loadPackage(["numpy", "pandas"]);

      notifyParent({ status: "loading", message: "Compiling Google Sheets & Salesforce utilities..." });

      await py.runPythonAsync(PYTHON_BOOTSTRAP_CODE);

      pyodideInstance = py;

      notifyParent({ status: "ready", message: "Pyodide Ready" });
      return pyodideInstance;
    } catch (err) {
      initPromise = null;
      notifyParent({ status: "error", error: err.message });
      throw err;
    }
  })();

  return initPromise;
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = url;
    s.onload = () => resolve();
    s.onerror = (err) => reject(err);
    document.head.appendChild(s);
  });
}

function notifyParent(data) {
  window.parent.postMessage({ source: "PYODIDE_SANDBOX", ...data }, "*");
}

// Handle requests from popup.js
window.addEventListener("message", async (event) => {
  const data = event.data;
  if (!data || data.target !== "PYODIDE_SANDBOX") return;

  const { id, action, payload } = data;

  try {
    const py = await initPyodideSandbox();

    const checkFn = py.runPython(" 'py_clean_csv' in globals() ");
    if (!checkFn) {
      await py.runPythonAsync(PYTHON_BOOTSTRAP_CODE);
    }

    let result = null;

    if (action === "ping") {
      result = {
        available: true,
        engine: "Pyodide WebAssembly",
        version: py.version,
      };
    } else if (action === "convert_sf_ids") {
      py.globals.set("temp_sf_ids", py.toPy(payload.ids));
      const raw = await py.runPythonAsync("py_convert_sf_ids(temp_sf_ids)");
      result = raw.toJs({ dict_converter: Object.fromEntries });
    } else if (action === "clean_csv") {
      py.globals.set("temp_csv_text", payload.csv_text);
      py.globals.set("temp_csv_options", py.toPy(payload.options || {}));
      const raw = await py.runPythonAsync("py_clean_csv(temp_csv_text, temp_csv_options)");
      result = raw.toJs({ dict_converter: Object.fromEntries });
    } else if (action === "statistics") {
      py.globals.set("temp_input_numbers", py.toPy(payload.numbers));
      const raw = await py.runPythonAsync("py_stats(temp_input_numbers)");
      result = raw.toJs({ dict_converter: Object.fromEntries });
    } else {
      throw new Error(`Unsupported action: ${action}`);
    }

    window.parent.postMessage({
      source: "PYODIDE_SANDBOX",
      id,
      success: true,
      data: result,
    }, "*");

  } catch (err) {
    window.parent.postMessage({
      source: "PYODIDE_SANDBOX",
      id,
      success: false,
      error: err.message,
    }, "*");
  }
});

initPyodideSandbox().catch((err) => {
  console.error("Pyodide bootstrap failed:", err);
});
