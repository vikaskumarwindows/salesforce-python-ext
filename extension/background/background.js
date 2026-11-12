/**
 * Background Service Worker (Manifest V3)
 *
 * Pre-warms and maintains the Pyodide WebAssembly runtime in a persistent
 * offscreen document so the extension popup loads instantly without delay.
 */

const OFFSCREEN_DOCUMENT_PATH = "offscreen/offscreen.html";

async function hasOffscreenDocument() {
  if ("getContexts" in chrome.runtime) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
    });
    return contexts.length > 0;
  }
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ target: "offscreen", action: "PING" }, (res) => {
      resolve(!chrome.runtime.lastError && res && res.pong);
    });
  });
}

let creatingPromise = null;
async function setupOffscreenDocument() {
  try {
    if (await hasOffscreenDocument()) {
      return;
    }
    if (creatingPromise) {
      await creatingPromise;
      return;
    }
    creatingPromise = chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ["WORKERS"],
      justification: "Pre-load and keep Pyodide CPython WebAssembly engine warm in memory",
    });
    await creatingPromise;
    creatingPromise = null;
    console.log("[Background] Offscreen Pyodide engine document initialized.");
  } catch (err) {
    creatingPromise = null;
    console.warn("[Background] Could not create offscreen document:", err);
  }
}

// Pre-warm engine immediately on install and browser startup
chrome.runtime.onInstalled.addListener(() => {
  setupOffscreenDocument();
});

chrome.runtime.onStartup.addListener(() => {
  setupOffscreenDocument();
});

// Also trigger pre-warm when service worker wakes up
setupOffscreenDocument();

// Listen for popup requests to ensure engine is running
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ENSURE_OFFSCREEN") {
    setupOffscreenDocument()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
