/**
 * Content Script
 * 1. Extracts numeric data from arbitrary web pages.
 * 2. Interfaces with open Google Sheets (docs.google.com/spreadsheets).
 * 3. Adds a new sheet tab (e.g. Sheet2) into the EXISTING open Google Spreadsheet.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 1. Google Sheets Extraction
  if (request.action === "GET_GOOGLE_SHEET_DATA") {
    handleGoogleSheetExtraction()
      .then((data) => sendResponse(data))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // 2. Add New Sheet Tab into the EXISTING Google Spreadsheet (e.g. Sheet2)
  if (request.action === "ADD_NEW_SHEET_TAB") {
    handleAddNewSheetTab(request.tsvData)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // 3. Generic Number Extraction for Stats
  if (request.action === "EXTRACT_NUMBERS") {
    try {
      const text = document.body.innerText || "";
      const matches = text.match(/-?\b\d+(\.\d+)?\b/g);
      const numbers = matches ? matches.map(Number).filter((n) => !isNaN(n)) : [];
      sendResponse({ success: true, count: numbers.length, numbers });
    } catch (err) {
      sendResponse({ success: false, error: err.message, numbers: [] });
    }
    return true;
  }
});

async function handleAddNewSheetTab(tsvData) {
  // Check if we are currently inside an active Google Spreadsheet
  if (!window.location.href.includes("docs.google.com/spreadsheets")) {
    return {
      success: false,
      error: "Active tab is not a Google Sheet. Switch to your open spreadsheet tab first.",
    };
  }

  // Find the "+" (Add Sheet) button at the bottom bar of Google Sheets
  const selectors = [
    'div[aria-label="Add Sheet"]',
    'div[aria-label="Add sheet"]',
    'div[aria-label*="Add Sheet"]',
    'div[aria-label*="Add sheet"]',
    'div[data-tooltip*="Add Sheet"]',
    'div[data-tooltip*="Add sheet"]',
    'div[data-tooltip*="Insert sheet"]',
    'div[aria-label*="Insert sheet"]',
    '.docs-sheet-add-button',
    '#add-sheet-button',
    '.docs-sheet-tab-slider-add',
  ];

  let addBtn = null;
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      addBtn = el;
      break;
    }
  }

  // Fallback: search in bottom tab bar buttons
  if (!addBtn) {
    const bottomBar = document.querySelector(".docs-sheet-tab-bar") || document.querySelector("#docs-editor") || document.body;
    const candidates = bottomBar.querySelectorAll('div[role="button"], div.goog-inline-block');
    for (const d of candidates) {
      const tip = (d.getAttribute("aria-label") || d.getAttribute("data-tooltip") || d.title || "").toLowerCase();
      if (tip.includes("add sheet") || tip.includes("insert sheet") || tip === "add") {
        addBtn = d;
        break;
      }
    }
  }

  let clicked = false;
  if (addBtn) {
    // Simulate full mouse interaction for Google UI Closure components
    simulateClick(addBtn);
    clicked = true;
  }

  // Also dispatch Google Sheets native keyboard shortcut: Shift + F11 (Insert New Sheet Tab)
  simulateShiftF11();

  // Wait for Google Sheets to insert the new tab and focus cell A1
  await new Promise((r) => setTimeout(r, 400));

  // If TSV data was provided, attempt simulated paste on cell A1
  if (tsvData) {
    try {
      const target = document.activeElement || document.querySelector(".cell-input") || document.body;
      const clipData = new DataTransfer();
      clipData.setData("text/plain", tsvData);
      const pasteEv = new ClipboardEvent("paste", {
        clipboardData: clipData,
        bubbles: true,
        cancelable: true,
      });
      target.dispatchEvent(pasteEv);
    } catch {
      // User can press Ctrl+V directly
    }
  }

  return {
    success: true,
    clicked,
    message: "New sheet tab added to this spreadsheet!",
  };
}

function simulateClick(el) {
  try {
    el.scrollIntoView({ block: "center", inline: "center" });
  } catch {}
  const opts = { bubbles: true, cancelable: true, view: window, buttons: 1 };
  try { el.dispatchEvent(new PointerEvent("pointerdown", opts)); } catch {}
  try { el.dispatchEvent(new MouseEvent("mousedown", opts)); } catch {}
  try { el.dispatchEvent(new PointerEvent("pointerup", opts)); } catch {}
  try { el.dispatchEvent(new MouseEvent("mouseup", opts)); } catch {}
  try { el.dispatchEvent(new MouseEvent("click", opts)); } catch {}
}

function simulateShiftF11() {
  const targets = [document.activeElement, document.body, document].filter(Boolean);
  const opts = {
    key: "F11",
    code: "F11",
    keyCode: 122,
    which: 122,
    shiftKey: true,
    bubbles: true,
    cancelable: true,
    view: window,
  };
  targets.forEach((t) => {
    try { t.dispatchEvent(new KeyboardEvent("keydown", opts)); } catch {}
    try { t.dispatchEvent(new KeyboardEvent("keyup", opts)); } catch {}
  });
}

async function handleGoogleSheetExtraction() {
  const url = window.location.href;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);

  if (!match) {
    return {
      success: false,
      error: "Active tab is not an open Google Sheet.",
      isGoogleSheet: false,
    };
  }

  const spreadsheetId = match[1];

  let gid = "0";
  const gidMatch = window.location.hash.match(/gid=([0-9]+)/) || window.location.search.match(/gid=([0-9]+)/);
  if (gidMatch) {
    gid = gidMatch[1];
  }

  let sheetTitle = document.title ? document.title.replace(" - Google Sheets", "").trim() : "Google Sheet";

  // Attempt Google Visualization API export first
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
  try {
    const res = await fetch(gvizUrl, { credentials: "include" });
    if (res.ok) {
      const csvText = await res.text();
      if (csvText && !csvText.includes("<!DOCTYPE html>")) {
        return {
          success: true,
          isGoogleSheet: true,
          spreadsheetId,
          gid,
          title: sheetTitle,
          csvText,
        };
      }
    }
  } catch (e) {
    // fallback
  }

  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  try {
    const res = await fetch(exportUrl, {
      credentials: "include",
      headers: { Accept: "text/csv,text/plain" },
    });

    if (res.ok) {
      const csvText = await res.text();
      return {
        success: true,
        isGoogleSheet: true,
        spreadsheetId,
        gid,
        title: sheetTitle,
        csvText,
      };
    }
  } catch (e) {
    // fallback
  }

  return {
    success: false,
    isGoogleSheet: true,
    spreadsheetId,
    gid,
    title: sheetTitle,
    error: "Could not auto-fetch sheet via export. Use Quick Paste (Ctrl+V) as fallback.",
  };
}
