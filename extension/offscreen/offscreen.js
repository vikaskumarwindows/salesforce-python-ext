/**
 * Persistent Offscreen Document Host for Pyodide WebAssembly
 *
 * Keeps CPython, NumPy, Pandas, and custom Python routines loaded in RAM.
 * Ensures the popup opens instantly without repeating the initialization.
 */

const pyodideFrame = document.getElementById("pyodideFrame");
let isPyodideReady = false;
let currentStatus = { status: "loading", message: "Starting CPython 3.12 WebAssembly..." };
const pendingCallbacks = new Map();
let messageCounter = 0;

let readyResolver = null;
const readyPromise = new Promise((resolve) => {
  readyResolver = resolve;
});

// Listen for messages from the sandboxed Pyodide frame
window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.source !== "PYODIDE_SANDBOX") return;

  if (data.status) {
    currentStatus = data;
    if (data.status === "ready") {
      isPyodideReady = true;
      if (readyResolver) {
        readyResolver(true);
        readyResolver = null;
      }
      if (chrome.action && chrome.action.setIcon) {
        chrome.action.setIcon({
          path: {
            "16": "../icons/icon16_green.png",
            "48": "../icons/icon48_green.png",
            "128": "../icons/icon128_green.png"
          }
        }).catch(() => {});
        chrome.action.setBadgeBackgroundColor({ color: "#10b981" }).catch(() => {});
        chrome.action.setBadgeText({ text: "✓" }).catch(() => {});
      }
      chrome.runtime.sendMessage({ target: "popup", type: "pyodide_status", status: "ready" }).catch(() => {});
      chrome.runtime.sendMessage({ type: "pyodide_status", status: "ready" }).catch(() => {});
    } else {
      chrome.runtime.sendMessage({ target: "popup", type: "pyodide_status", ...data }).catch(() => {});
    }
    return;
  }

  if (data.id && pendingCallbacks.has(data.id)) {
    const cb = pendingCallbacks.get(data.id);
    pendingCallbacks.delete(data.id);
    cb(data);
  }
});

// Execute action on warm Pyodide instance
async function executeOnPyodide(action, payload) {
  if (!isPyodideReady) {
    // Wait until boot completes
    await readyPromise;
  }

  return new Promise((resolve, reject) => {
    const id = ++messageCounter;
    pendingCallbacks.set(id, (res) => {
      if (res.success) {
        resolve(res.data);
      } else {
        reject(new Error(res.error || "Pyodide execution failed"));
      }
    });

    pyodideFrame.contentWindow.postMessage(
      {
        target: "PYODIDE_SANDBOX",
        id,
        action,
        payload,
      },
      "*"
    );
  });
}

// Handle runtime messages from popup and background service worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.target !== "offscreen") return;

  if (request.action === "PING") {
    sendResponse({ pong: true, ready: isPyodideReady });
    return true;
  }

  if (request.action === "GET_STATUS") {
    sendResponse({ ready: isPyodideReady, status: currentStatus });
    return true;
  }

  if (request.action === "EXECUTE") {
    executeOnPyodide(request.method, request.payload)
      .then((result) => sendResponse({ success: true, result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

console.log("[Offscreen Host] Pyodide persistent engine initialized.");
