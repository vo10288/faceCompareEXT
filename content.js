/* content.js – Face Compare 1:1 */

let slots = { A: null, B: null };

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SET_FACE_SLOT") {
    slots[msg.slot] = {
      srcUrl: msg.srcUrl,
      pageUrl: msg.pageUrl || location.href,
      pageTitle: document.title || ""
    };
    chrome.runtime.sendMessage({
      type: "SLOT_UPDATED",
      slot: msg.slot,
      data: slots[msg.slot]
    }).catch(() => {});
  }

  if (msg.type === "GET_SLOTS") {
    sendResponse({ slots });
  }
});
