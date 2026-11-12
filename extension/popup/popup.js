/**
 * Salesforce & Google Sheet Studio - UI Controller
 * 100% In-Browser WebAssembly Python (Pyodide)
 */

document.addEventListener("DOMContentLoaded", () => {
  // Navigation & Status
  const loadingOverlay = document.getElementById("loadingOverlay");
  const spinnerTextTitle = document.getElementById("spinnerTextTitle");
  const spinnerSubtext = document.getElementById("spinnerSubtext");

  const engineStatus = document.getElementById("engineStatus");
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  // Tab 1: Salesforce ID Fixer
  const sfSingleId = document.getElementById("sfSingleId");
  const convertSingleBtn = document.getElementById("convertSingleBtn");
  const singleResultBox = document.getElementById("singleResultBox");
  const singleResultText = document.getElementById("singleResultText");
  const copySingleBtn = document.getElementById("copySingleBtn");

  const sfBulkIds = document.getElementById("sfBulkIds");
  const convertBulkBtn = document.getElementById("convertBulkBtn");
  const bulkResultBox = document.getElementById("bulkResultBox");
  const bulkResultText = document.getElementById("bulkResultText");
  const bulkCount = document.getElementById("bulkCount");
  const copyBulkBtn = document.getElementById("copyBulkBtn");

  // Tab 2: Sheet & CSV Cleanser
  const gsheetStatusIcon = document.getElementById("gsheetStatusIcon");
  const gsheetStatusHeading = document.getElementById("gsheetStatusHeading");
  const gsheetTitle = document.getElementById("gsheetTitle");
  const readGsheetBtn = document.getElementById("readGsheetBtn");

  const dropZone = document.getElementById("dropZone");
  const dropText = document.getElementById("dropText");
  const csvFileInput = document.getElementById("csvFileInput");
  const pasteSheetInput = document.getElementById("pasteSheetInput");
  const loadPastedBtn = document.getElementById("loadPastedBtn");

  const optTrimSpaces = document.getElementById("optTrimSpaces");
  const optFixDates = document.getElementById("optFixDates");
  const dateFormatSettings = document.getElementById("dateFormatSettings");
  const targetDateFormat = document.getElementById("targetDateFormat");
  const optConvertIds = document.getElementById("optConvertIds");
  const optDropDupes = document.getElementById("optDropDupes");
  const cleanCsvBtn = document.getElementById("cleanCsvBtn");
  const headerLogo = document.getElementById("headerLogo");
  const csvAuditResults = document.getElementById("csvAuditResults");
  const auditMetricsGrid = document.getElementById("auditMetricsGrid");
  const cleaningSummary = document.getElementById("cleaningSummary");
  const copyForGsheetBtn = document.getElementById("copyForGsheetBtn");
  const addNewSheetBtn = document.getElementById("addNewSheetBtn");
  const downloadCsvBtn = document.getElementById("downloadCsvBtn");
  const previewShapeTag = document.getElementById("previewShapeTag");
  const openFullscreenModalBtn = document.getElementById("openFullscreenModalBtn");
  const csvPreviewTableContainer = document.getElementById("csvPreviewTableContainer");

  // Salesforce Fullscreen Modal Elements
  const fullscreenModal = document.getElementById("fullscreenModal");
  const modalBackdrop = document.getElementById("modalBackdrop");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const modalCloseFooterBtn = document.getElementById("modalCloseFooterBtn");
  const modalTitle = document.getElementById("modalTitle");
  const modalSubtitle = document.getElementById("modalSubtitle");
  const modalSearchInput = document.getElementById("modalSearchInput");
  const modalRowCountTag = document.getElementById("modalRowCountTag");
  const modalTableContainer = document.getElementById("modalTableContainer");
  const modalNewTabBtn = document.getElementById("modalNewTabBtn");
  const modalCopyBtn = document.getElementById("modalCopyBtn");
  const modalDownloadBtn = document.getElementById("modalDownloadBtn");

  // Tab 3: Numerical Stats
  const numbersInput = document.getElementById("numbersInput");
  const calcStatsBtn = document.getElementById("calcStatsBtn");
  const statsResults = document.getElementById("statsResults");
  const statsGrid = document.getElementById("statsGrid");
  const scrapePageBtn = document.getElementById("scrapePageBtn");
  const scrapeResults = document.getElementById("scrapeResults");
  const scrapeMetrics = document.getElementById("scrapeMetrics");

  const pyodideFrame = document.getElementById("pyodideFrame");

  let pyodideReady = false;
  let pyodidePendingCallbacks = new Map();
  let messageCounter = 0;

  let loadedCsvText = null;
  let loadedDataName = "spreadsheet.csv";
  let cleanedCsvOutput = null;
  let cleanedTsvOutput = null;

  let detectedSpreadsheetId = null;
  let detectedGid = "0";
  let detectedSheetTitle = "Google Sheet";

  setButtonsState(false);
  checkActiveTabForGoogleSheet();

  // Tab navigation
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      tabPanes.forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const targetPane = document.getElementById(btn.dataset.tab);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  function setEngineIndicator(state, text) {
    engineStatus.innerHTML = `
      <span class="dot ${state}"></span>
      <span class="status-text">${text}</span>
    `;
  }

  function setButtonsState(ready) {
    convertSingleBtn.disabled = !ready;
    convertBulkBtn.disabled = !ready;
    calcStatsBtn.disabled = !ready;
    scrapePageBtn.disabled = !ready;

    if (ready && detectedSpreadsheetId) {
      readGsheetBtn.disabled = false;
    }

    if (ready && loadedCsvText) {
      cleanCsvBtn.disabled = false;
    }
  }

  // Connect to persistent warm offscreen Pyodide engine
  async function connectToPyodideEngine() {
    try {
      // 1. Check if the offscreen document is already warm
      const res = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ target: "offscreen", action: "GET_STATUS" }, (r) => {
          if (chrome.runtime.lastError || !r) {
            resolve(null);
          } else {
            resolve(r);
          }
        });
      });

      if (res && res.ready) {
        // Already warm and ready in memory! Instant open!
        pyodideReady = true;
        setEngineIndicator("online", "Python Wasm (Warm in Memory)");
        setButtonsState(true);
        updateLogoState(true);
        if (loadingOverlay) loadingOverlay.classList.add("loaded");
        return;
      }

      // If not yet running, ensure background creates the offscreen document
      chrome.runtime.sendMessage({ action: "ENSURE_OFFSCREEN" }).catch(() => {});

      if (res && res.status) {
        setEngineIndicator("loading", res.status.message || "Starting Python Wasm...");
        if (spinnerTextTitle) spinnerTextTitle.textContent = res.status.message || "Starting Python Wasm...";
      }
    } catch (e) {
      console.warn("Could not query offscreen engine:", e);
    }
  }

  function updateLogoState(isReady) {
    if (headerLogo) {
      if (isReady) {
        headerLogo.classList.add("green-ready");
      } else {
        headerLogo.classList.remove("green-ready");
      }
    }

    if (chrome.action && chrome.action.setIcon) {
      if (isReady) {
        chrome.action.setIcon({
          path: {
            "16": "../icons/icon16_green.png",
            "48": "../icons/icon48_green.png",
            "128": "../icons/icon128_green.png"
          }
        }).catch(() => {});
        chrome.action.setBadgeBackgroundColor({ color: "#10b981" }).catch(() => {});
        chrome.action.setBadgeText({ text: "✓" }).catch(() => {});
      } else {
        chrome.action.setIcon({
          path: {
            "16": "../icons/icon16.png",
            "48": "../icons/icon48.png",
            "128": "../icons/icon128.png"
          }
        }).catch(() => {});
        chrome.action.setBadgeBackgroundColor({ color: "#6366f1" }).catch(() => {});
        chrome.action.setBadgeText({ text: "..." }).catch(() => {});
      }
    }
  }

  connectToPyodideEngine();

  // Listen for broadcast status updates from offscreen document
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.target === "popup" && msg.type === "pyodide_status") {
      if (msg.status === "ready") {
        pyodideReady = true;
        setEngineIndicator("online", "Python Wasm (Warm in Memory)");
        setButtonsState(true);
        updateLogoState(true);
        if (loadingOverlay) loadingOverlay.classList.add("loaded");
      } else if (msg.status === "loading") {
        setEngineIndicator("loading", msg.message || "Initializing Python Wasm...");
        if (spinnerTextTitle) spinnerTextTitle.textContent = msg.message || "Initializing Python Wasm...";
      } else if (msg.status === "error") {
        setEngineIndicator("offline", "Python Error");
        if (spinnerTextTitle) spinnerTextTitle.textContent = "Initialization Error";
        if (spinnerSubtext) spinnerSubtext.textContent = msg.error || "Failed to load Python Wasm.";
      }
    }
  });

  // Handle fallback messages if local frame is ever used
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.source !== "PYODIDE_SANDBOX") return;

    if (data.status === "ready") {
      pyodideReady = true;
      setEngineIndicator("online", "Python Wasm Ready");
      setButtonsState(true);
      updateLogoState(true);
      if (loadingOverlay) loadingOverlay.classList.add("loaded");
    } else if (data.id && pyodidePendingCallbacks.has(data.id)) {
      const cb = pyodidePendingCallbacks.get(data.id);
      pyodidePendingCallbacks.delete(data.id);
      cb(data);
    }
  });

  async function sendPyodide(action, payload = {}) {
    // 1. Fast path: execute in persistent warm offscreen document
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { target: "offscreen", action: "EXECUTE", method: action, payload },
          (res) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (!res) {
              reject(new Error("No response from persistent engine"));
            } else if (!res.success) {
              reject(new Error(res.error || "Execution failed"));
            } else {
              resolve(res.result);
            }
          }
        );
      });
      return response;
    } catch (offscreenErr) {
      console.warn("Offscreen engine execution failed, attempting local fallback:", offscreenErr);
    }

    // 2. Fallback path: local iframe if offscreen document is somehow unavailable
    if (pyodideFrame && !pyodideFrame.src) {
      pyodideFrame.src = "../pyodide/sandbox.html";
    }

    return new Promise((resolve, reject) => {
      const id = ++messageCounter;
      pyodidePendingCallbacks.set(id, (res) => {
        if (res.success) resolve(res.data);
        else reject(new Error(res.error || "Execution error"));
      });

      pyodideFrame.contentWindow.postMessage(
        { target: "PYODIDE_SANDBOX", id, action, payload },
        "*"
      );
    });
  }

  // ==========================================
  // Google Sheets Direct Reading
  // ==========================================
  async function checkActiveTabForGoogleSheet() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;

      const url = tab.url || "";
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);

      if (match) {
        detectedSpreadsheetId = match[1];
        const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
        detectedGid = gidMatch ? gidMatch[1] : "0";
        detectedSheetTitle = tab.title ? tab.title.replace(" - Google Sheets", "").trim() : "Google Sheet";

        gsheetStatusIcon.textContent = "🟢";
        gsheetStatusHeading.textContent = "Open Google Sheet Detected";
        gsheetTitle.textContent = detectedSheetTitle;
        readGsheetBtn.textContent = `📥 Read "${detectedSheetTitle}" Data`;
        readGsheetBtn.disabled = !pyodideReady;
      } else {
        gsheetStatusIcon.textContent = "ℹ️";
        gsheetStatusHeading.textContent = "No Google Sheet in Current Tab";
        gsheetTitle.textContent = "Switch to an open Google Sheet or upload a CSV below";
        readGsheetBtn.textContent = "Open a Google Sheet Tab to Read";
        readGsheetBtn.disabled = true;
      }
    } catch (err) {
      console.warn("Could not query tab:", err);
    }
  }

  readGsheetBtn.addEventListener("click", async () => {
    if (!detectedSpreadsheetId) return;

    readGsheetBtn.textContent = "📥 Reading Sheet via WebAssembly...";
    readGsheetBtn.disabled = true;

    try {
      // 1. Try Google Visualization API CSV export (works with active session cookies)
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${detectedSpreadsheetId}/gviz/tq?tqx=out:csv&gid=${detectedGid}`;
      let csvData = null;

      try {
        const res = await fetch(gvizUrl, { credentials: "include" });
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().length > 0 && !text.includes("<!DOCTYPE html>")) {
            csvData = text;
          }
        }
      } catch (e) {
        console.warn("gviz fetch error:", e);
      }

      // 2. Try standard export URL if gviz failed
      if (!csvData) {
        try {
          const exportUrl = `https://docs.google.com/spreadsheets/d/${detectedSpreadsheetId}/export?format=csv&gid=${detectedGid}`;
          const res = await fetch(exportUrl, { credentials: "include" });
          if (res.ok) {
            const text = await res.text();
            if (text && text.trim().length > 0 && !text.includes("<!DOCTYPE html>")) {
              csvData = text;
            }
          }
        } catch (e) {
          console.warn("export fetch error:", e);
        }
      }

      // 3. Fallback: ask content script in active tab to read
      if (!csvData) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          csvData = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tab.id, { action: "GET_GOOGLE_SHEET_DATA" }, (res) => {
              if (!chrome.runtime.lastError && res && res.success && res.csvText) {
                resolve(res.csvText);
              } else {
                resolve(null);
              }
            });
          });
        }
      }

      if (csvData && csvData.trim().length > 0) {
        loadedCsvText = csvData;
        loadedDataName = (detectedSheetTitle || "google_sheet") + ".csv";
        dropText.innerHTML = `<strong>${detectedSheetTitle}</strong><br><span style="color:#10b981;">✓ Successfully read from Google Sheet!</span>`;
        cleanCsvBtn.textContent = "Clean & Correct Sheet Data (Python Pandas)";
        cleanCsvBtn.disabled = false;
        readGsheetBtn.textContent = `✓ Read "${detectedSheetTitle}" Data`;
        readGsheetBtn.disabled = false;

        // Automatically trigger clean preview
        cleanCsvBtn.click();
      } else {
        throw new Error(
          "Could not read sheet automatically (this Google Sheet may have restricted export permissions).\n\n" +
          "Fast Alternative: In your Google Sheet, press Ctrl+A, then Ctrl+C, and paste into the 'Or Paste Cells' box below!"
        );
      }
    } catch (err) {
      alert(err.message);
      readGsheetBtn.textContent = `📥 Read "${detectedSheetTitle}" Data`;
      readGsheetBtn.disabled = false;
    }
  });

  // Paste from Google Sheet handler
  loadPastedBtn.addEventListener("click", () => {
    const raw = pasteSheetInput.value.trim();
    if (!raw) {
      alert("Please paste data copied from Google Sheet first.");
      return;
    }

    loadedCsvText = raw;
    loadedDataName = "pasted_google_sheet.csv";
    dropText.innerHTML = `<strong>Pasted Google Sheet Data</strong><br><span style="color:#10b981;">✓ Loaded ${raw.split("\n").length} rows!</span>`;
    cleanCsvBtn.textContent = "Clean & Correct Pasted Data (Python Pandas)";
    cleanCsvBtn.disabled = false;
    cleanCsvBtn.click();
  });

  // ==========================================
  // Feature 1: Salesforce 15-to-18 ID Fixer
  // ==========================================
  convertSingleBtn.addEventListener("click", async () => {
    const idVal = sfSingleId.value.trim();
    if (!idVal) {
      alert("Please enter a 15-character Salesforce ID.");
      return;
    }

    try {
      const res = await sendPyodide("convert_sf_ids", { ids: [idVal] });
      if (res && res.length > 0) {
        singleResultText.textContent = res[0].converted;
        singleResultBox.classList.remove("hidden");
      }
    } catch (err) {
      alert("Conversion Error: " + err.message);
    }
  });

  copySingleBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(singleResultText.textContent);
    copySingleBtn.textContent = "Copied!";
    setTimeout(() => (copySingleBtn.textContent = "Copy"), 1500);
  });

  convertBulkBtn.addEventListener("click", async () => {
    const raw = sfBulkIds.value.trim();
    if (!raw) {
      alert("Please paste one or more Salesforce IDs.");
      return;
    }

    const ids = raw.split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return;

    convertBulkBtn.textContent = "Converting in Python...";
    convertBulkBtn.disabled = true;

    try {
      const res = await sendPyodide("convert_sf_ids", { ids });
      const convertedList = res.map((r) => r.converted);
      bulkResultText.textContent = convertedList.join("\n");
      bulkCount.textContent = convertedList.length;
      bulkResultBox.classList.remove("hidden");
    } catch (err) {
      alert("Bulk Conversion Error: " + err.message);
    } finally {
      convertBulkBtn.textContent = "Convert All IDs";
      convertBulkBtn.disabled = false;
    }
  });

  copyBulkBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(bulkResultText.textContent);
    copyBulkBtn.textContent = "Copied All!";
    setTimeout(() => (copyBulkBtn.textContent = "Copy All"), 1500);
  });

  // ==========================================
  // Feature 2: Smart Sheet & CSV Cleanser
  // ==========================================
  dropZone.addEventListener("click", () => csvFileInput.click());

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      handleCsvFile(e.dataTransfer.files[0]);
    }
  });

  csvFileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleCsvFile(e.target.files[0]);
    }
  });

  function handleCsvFile(file) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Please select a valid .CSV spreadsheet file.");
      return;
    }

    loadedDataName = "cleaned_" + file.name;
    const reader = new FileReader();

    reader.onload = (e) => {
      loadedCsvText = e.target.result;
      dropText.innerHTML = `<strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB loaded)`;
      cleanCsvBtn.textContent = "Clean & Correct Data (Python Pandas)";
      if (pyodideReady) {
        cleanCsvBtn.disabled = false;
      }
    };

    reader.readAsText(file);
  }

  if (optFixDates && dateFormatSettings) {
    optFixDates.addEventListener("change", () => {
      dateFormatSettings.style.display = optFixDates.checked ? "flex" : "none";
    });
  }

  cleanCsvBtn.addEventListener("click", async () => {
    if (!loadedCsvText) return;

    cleanCsvBtn.textContent = "Cleaning in Pandas Wasm...";
    cleanCsvBtn.disabled = true;

    const options = {
      trim_whitespace: optTrimSpaces.checked,
      standardize_dates: optFixDates.checked,
      target_date_format: targetDateFormat ? targetDateFormat.value : "YYYY-MM-DD",
      convert_sf_ids: optConvertIds.checked,
      drop_duplicates: optDropDupes.checked,
    };

    try {
      const res = await sendPyodide("clean_csv", {
        csv_text: loadedCsvText,
        options,
      });

      cleanedCsvOutput = res.cleaned_csv;
      cleanedTsvOutput = res.cleaned_tsv;
      renderCsvAudit(res.audit);
      csvAuditResults.classList.remove("hidden");
    } catch (err) {
      alert("Cleaning Error: " + err.message);
    } finally {
      cleanCsvBtn.textContent = "Clean & Correct Data (Python Pandas)";
      cleanCsvBtn.disabled = false;
    }
  });

  let currentAuditData = null;

  function renderCsvAudit(audit) {
    currentAuditData = audit;
    auditMetricsGrid.innerHTML = `
      <div class="metric-item">
        <div class="name">Initial Rows</div>
        <div class="value">${audit.initial_rows}</div>
      </div>
      <div class="metric-item">
        <div class="name">Cleaned Rows</div>
        <div class="value">${audit.final_rows}</div>
      </div>
      <div class="metric-item">
        <div class="name">Total Columns</div>
        <div class="value">${audit.initial_cols}</div>
      </div>
      <div class="metric-item">
        <div class="name">Duplicates Removed</div>
        <div class="value">${audit.duplicates_removed}</div>
      </div>
    `;

    const summaryParts = [];
    if (audit.sf_ids_converted_cols.length > 0) {
      summaryParts.push(`✓ Converted 15-to-18 char IDs in: <strong>${audit.sf_ids_converted_cols.join(", ")}</strong>`);
    }
    if (audit.dates_standardized_cols && audit.dates_standardized_cols.length > 0) {
      summaryParts.push(`✓ Standardized dates in: <strong>${audit.dates_standardized_cols.join(", ")}</strong>`);
    }
    if (audit.whitespace_trimmed_cols.length > 0) {
      summaryParts.push(`✓ Trimmed whitespace on: ${audit.whitespace_trimmed_cols.length} text columns`);
    }

    cleaningSummary.innerHTML = summaryParts.length > 0
      ? summaryParts.join("<br>")
      : "✓ No formatting errors detected. Data formatted to Salesforce & Sheet specs.";

    // Render In-Popup Preview Table
    if (audit.preview && audit.preview.length > 0) {
      const cols = Object.keys(audit.preview[0]);

      if (previewShapeTag) {
        previewShapeTag.textContent = `${cols.length} cols • ${audit.preview.length} preview rows (${audit.final_rows} total)`;
      }

      // Compact-fit without horizontal scroll when columns are 5 or fewer
      if (cols.length <= 5) {
        csvPreviewTableContainer.classList.add("compact-fit");
      } else {
        csvPreviewTableContainer.classList.remove("compact-fit");
      }

      let html = '<table class="preview-table"><thead><tr>';
      cols.forEach((c) => (html += `<th>${c}</th>`));
      html += "</tr></thead><tbody>";

      audit.preview.forEach((row) => {
        html += "<tr>";
        cols.forEach((c) => (html += `<td>${row[c] !== null && row[c] !== undefined ? row[c] : ""}</td>`));
        html += "</tr>";
      });

      html += "</tbody></table>";
      csvPreviewTableContainer.innerHTML = html;
    }
  }

  // ==========================================
  // Salesforce-Style Fullscreen Modal Viewer
  // ==========================================
  function openFullscreenModal() {
    if (!currentAuditData || !currentAuditData.preview) {
      alert("Please clean or load a dataset first.");
      return;
    }

    modalTitle.textContent = loadedDataName || "Cleaned Data Preview";
    modalSubtitle.textContent = `${currentAuditData.initial_cols} columns • ${currentAuditData.final_rows} total rows (Processed by Pandas Wasm)`;
    modalSearchInput.value = "";

    renderModalTable(currentAuditData.preview);
    fullscreenModal.classList.remove("hidden");
  }

  function closeFullscreenModal() {
    fullscreenModal.classList.add("hidden");
  }

  function renderModalTable(rows) {
    if (!rows || rows.length === 0) {
      modalTableContainer.innerHTML = '<p style="padding: 16px; color: #94a3b8; text-align: center;">No matching rows found.</p>';
      modalRowCountTag.textContent = "0 rows";
      return;
    }

    const cols = Object.keys(rows[0]);
    modalRowCountTag.textContent = `${rows.length} rows`;

    let html = '<table class="preview-table"><thead><tr>';
    html += '<th style="width: 32px; text-align: center;">#</th>';
    cols.forEach((c) => (html += `<th>${c}</th>`));
    html += "</tr></thead><tbody>";

    rows.forEach((row, i) => {
      html += `<tr><td style="color:#64748b; text-align: center; font-size: 10px;">${i + 1}</td>`;
      cols.forEach((c) => {
        const val = row[c] !== null && row[c] !== undefined ? row[c] : "";
        html += `<td>${val}</td>`;
      });
      html += "</tr>";
    });

    html += "</tbody></table>";
    modalTableContainer.innerHTML = html;
  }

  // Real-time row filtering inside the modal
  modalSearchInput.addEventListener("input", (e) => {
    if (!currentAuditData || !currentAuditData.preview) return;
    const q = e.target.value.toLowerCase().trim();

    if (!q) {
      renderModalTable(currentAuditData.preview);
      return;
    }

    const filtered = currentAuditData.preview.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    );
    renderModalTable(filtered);
  });

  openFullscreenModalBtn.addEventListener("click", openFullscreenModal);
  closeModalBtn.addEventListener("click", closeFullscreenModal);
  modalCloseFooterBtn.addEventListener("click", closeFullscreenModal);
  modalBackdrop.addEventListener("click", closeFullscreenModal);

  // Close modal on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !fullscreenModal.classList.contains("hidden")) {
      closeFullscreenModal();
    }
  });

  // Modal Copy All
  modalCopyBtn.addEventListener("click", () => {
    if (!cleanedTsvOutput) return;
    navigator.clipboard.writeText(cleanedTsvOutput).then(() => {
      const orig = modalCopyBtn.textContent;
      modalCopyBtn.textContent = "✓ Copied to Clipboard!";
      setTimeout(() => (modalCopyBtn.textContent = orig), 2500);
    });
  });

  // Modal Download CSV
  modalDownloadBtn.addEventListener("click", () => {
    downloadCsvBtn.click();
  });

  // Open in Full Chrome Tab (Standalone 1080p viewer)
  modalNewTabBtn.addEventListener("click", () => {
    if (!currentAuditData || !currentAuditData.preview) return;

    // Save dataset to chrome.storage.local for the standalone viewer tab
    chrome.storage.local.set(
      {
        previewData: currentAuditData.preview,
        cleanedCsv: cleanedCsvOutput,
        cleanedTsv: cleanedTsvOutput,
        datasetName: loadedDataName || "Cleaned Data",
      },
      () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("preview/preview.html") });
      }
    );
  });

  // Copy directly for Google Sheets paste (Cell-preserving TSV format)
  copyForGsheetBtn.addEventListener("click", () => {
    if (!cleanedTsvOutput) return;

    navigator.clipboard.writeText(cleanedTsvOutput).then(() => {
      const origText = copyForGsheetBtn.innerHTML;
      copyForGsheetBtn.innerHTML = "✓ Copied! Go to Google Sheet & Press Ctrl+V in A1";
      setTimeout(() => (copyForGsheetBtn.innerHTML = origText), 3000);
    });
  });

  // Add as New Sheet Tab in EXISTING Google Spreadsheet (e.g. Sheet2)
  addNewSheetBtn.addEventListener("click", async () => {
    if (!cleanedTsvOutput) return;

    // 1. Write cleaned TSV to clipboard
    try {
      await navigator.clipboard.writeText(cleanedTsvOutput);
    } catch (e) {
      console.warn("Clipboard write error:", e);
    }

    // 2. Locate the target Google Spreadsheet tab
    try {
      let targetTab = null;
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (activeTab && activeTab.url && activeTab.url.includes("docs.google.com/spreadsheets")) {
        targetTab = activeTab;
      } else {
        // Find open Google Sheet tab across windows
        const sheetTabs = await chrome.tabs.query({ url: "*://docs.google.com/spreadsheets/*" });
        if (sheetTabs && sheetTabs.length > 0) {
          targetTab = sheetTabs[0];
          // Bring the spreadsheet tab to the foreground
          await chrome.tabs.update(targetTab.id, { active: true });
        }
      }

      if (!targetTab) {
        alert(
          "No open Google Spreadsheet tab found!\n\n" +
          "Please open your existing Google Sheet tab first so the extension can insert a new sheet tab (e.g. Sheet2) into it."
        );
        return;
      }

      const origText = addNewSheetBtn.innerHTML;
      addNewSheetBtn.innerHTML = "⏳ Adding new sheet tab into spreadsheet...";
      addNewSheetBtn.disabled = true;

      const sendAddSheet = () => {
        return new Promise((resolve) => {
          chrome.tabs.sendMessage(targetTab.id, { action: "ADD_NEW_SHEET_TAB", tsvData: cleanedTsvOutput }, (res) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
              resolve(res || { success: true });
            }
          });
        });
      };

      let result = await sendAddSheet();

      // Retry after injecting content script if tab didn't have it loaded yet
      if (!result.success && result.error && result.error.includes("Receiving end does not exist")) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: targetTab.id },
            files: ["content/content.js"],
          });
          await new Promise((r) => setTimeout(r, 200));
          result = await sendAddSheet();
        } catch (injectErr) {
          console.warn("Script injection failed:", injectErr);
        }
      }

      if (result && result.success) {
        addNewSheetBtn.innerHTML = "✓ Added New Sheet Tab! Press Ctrl+V in A1";
      } else {
        addNewSheetBtn.innerHTML = "✓ New Sheet Tab Triggered! Press Ctrl+V in A1";
      }

      setTimeout(() => {
        addNewSheetBtn.innerHTML = origText;
        addNewSheetBtn.disabled = false;
      }, 4000);
    } catch (err) {
      console.error("Error adding sheet tab:", err);
      addNewSheetBtn.innerHTML = "➕ Add New Sheet Tab into Spreadsheet";
      addNewSheetBtn.disabled = false;
      alert("Could not add new sheet tab: " + err.message);
    }
  });

  // Download Cleaned CSV
  downloadCsvBtn.addEventListener("click", () => {
    if (!cleanedCsvOutput) return;

    const blob = new Blob([cleanedCsvOutput], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = loadedDataName.endsWith(".csv") ? loadedDataName : loadedDataName + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // ==========================================
  // Feature 3: Numerical Stats & Page Scrape
  // ==========================================
  calcStatsBtn.addEventListener("click", async () => {
    const rawText = numbersInput.value.trim();
    if (!rawText) {
      alert("Please enter numbers separated by commas.");
      return;
    }

    const numbers = rawText
      .split(",")
      .map((n) => parseFloat(n.trim()))
      .filter((n) => !isNaN(n));

    if (numbers.length === 0) {
      alert("No valid numbers found.");
      return;
    }

    calcStatsBtn.textContent = "Calculating...";
    calcStatsBtn.disabled = true;

    try {
      const data = await sendPyodide("statistics", { numbers });
      renderStats(data, statsGrid);
      statsResults.classList.remove("hidden");
    } catch (error) {
      alert("Calculation Error: " + error.message);
    } finally {
      calcStatsBtn.textContent = "Calculate Stats (NumPy)";
      calcStatsBtn.disabled = false;
    }
  });

  function renderStats(data, container) {
    const keys = ["count", "mean", "median", "std_dev", "min", "max", "sum", "q25", "q75", "skewness"];
    container.innerHTML = keys
      .filter((k) => k in data)
      .map(
        (k) => `
        <div class="metric-item">
          <div class="name">${k.replace("_", " ")}</div>
          <div class="value">${typeof data[k] === "number" ? data[k].toFixed(2) : data[k]}</div>
        </div>
      `
      )
      .join("");
  }

  scrapePageBtn.addEventListener("click", async () => {
    scrapePageBtn.textContent = "Scraping page numbers...";
    scrapePageBtn.disabled = true;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        alert("Cannot access active tab.");
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_NUMBERS" }, async (response) => {
        if (chrome.runtime.lastError || !response) {
          alert("Could not extract numbers. Refresh the target page and retry.");
          scrapePageBtn.textContent = "Extract & Profile Page Numbers";
          scrapePageBtn.disabled = false;
          return;
        }

        const numbers = response.numbers || [];
        if (numbers.length === 0) {
          alert("No numbers found on this page.");
          scrapePageBtn.textContent = "Extract & Profile Page Numbers";
          scrapePageBtn.disabled = false;
          return;
        }

        const data = await sendPyodide("statistics", { numbers: numbers.slice(0, 500) });
        renderStats(data, scrapeMetrics);
        scrapeResults.classList.remove("hidden");

        scrapePageBtn.textContent = "Extract & Profile Page Numbers";
        scrapePageBtn.disabled = false;
      });
    } catch (err) {
      alert("Error: " + err.message);
      scrapePageBtn.textContent = "Extract & Profile Page Numbers";
      scrapePageBtn.disabled = false;
    }
  });
});
