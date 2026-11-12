/**
 * Background Service Worker (Manifest V3)
 * Operates 100% inside Google Chrome (No servers / No native host).
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log("Python In-Browser Analytics extension installed successfully.");
});
