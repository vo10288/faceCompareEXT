/* background.js – Face Compare 1:1 */

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "set-face-a",
    title: "Face Compare → Imposta come Volto A",
    contexts: ["image"]
  });
  chrome.contextMenus.create({
    id: "set-face-b",
    title: "Face Compare → Imposta come Volto B",
    contexts: ["image"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "set-face-a") {
    chrome.tabs.sendMessage(tab.id, {
      type: "SET_FACE_SLOT",
      slot: "A",
      srcUrl: info.srcUrl,
      pageUrl: tab.url
    });
    try { await chrome.action.openPopup(); } catch (e) {}
  }
  if (info.menuItemId === "set-face-b") {
    chrome.tabs.sendMessage(tab.id, {
      type: "SET_FACE_SLOT",
      slot: "B",
      srcUrl: info.srcUrl,
      pageUrl: tab.url
    });
    try { await chrome.action.openPopup(); } catch (e) {}
  }
});

// Helper: ArrayBuffer -> base64
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// Fetch immagine → dataUrl
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "FETCH_IMAGE_AS_DATAURL") {
    (async () => {
      const res = await fetch(msg.url, { credentials: "omit" });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const ct = res.headers.get("content-type") || "image/jpeg";
      const ab = await res.arrayBuffer();
      const b64 = arrayBufferToBase64(ab);
      sendResponse({ ok: true, dataUrl: `data:${ct};base64,${b64}` });
    })().catch(err => {
      sendResponse({ ok: false, error: String(err?.message || err) });
    });
    return true;
  }
});
