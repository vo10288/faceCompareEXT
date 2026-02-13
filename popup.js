import { initFaceApi, extractAllFaces, compareDescriptors, drawFaceLandmarks } from "./face-recognition.js";

// ── DOM ──────────────────────────────────────────────────────────
const previewA = document.getElementById("previewA");
const previewB = document.getElementById("previewB");
const pickerA  = document.getElementById("pickerA");
const pickerB  = document.getElementById("pickerB");
const hintA    = document.getElementById("hintA");
const hintB    = document.getElementById("hintB");
const slotAEl  = document.getElementById("slotA");
const slotBEl  = document.getElementById("slotB");
const fileA    = document.getElementById("fileA");
const fileB    = document.getElementById("fileB");
const compareBtn = document.getElementById("compare");
const resultEl = document.getElementById("result");
const resultLabel  = document.getElementById("resultLabel");
const resultScore  = document.getElementById("resultScore");
const resultDetail = document.getElementById("resultDetail");
const meterFill    = document.getElementById("meterFill");
const modelStatus  = document.getElementById("modelStatus");
const errEl        = document.getElementById("err");

// ── State ────────────────────────────────────────────────────────
let faceApiReady = false;

const state = {
  A: { dataUrl: null, faces: [], selectedIdx: 0 },
  B: { dataUrl: null, faces: [], selectedIdx: 0 }
};

// ── Utility ──────────────────────────────────────────────────────
function showErr(msg) {
  errEl.style.display = msg ? "block" : "none";
  errEl.textContent = msg || "";
}

function getPreview(slot) { return slot === "A" ? previewA : previewB; }
function getPicker(slot)  { return slot === "A" ? pickerA : pickerB; }
function getHint(slot)    { return slot === "A" ? hintA : hintB; }
function getSlotEl(slot)  { return slot === "A" ? slotAEl : slotBEl; }

// ── Init modelli ─────────────────────────────────────────────────
async function loadModels() {
  try {
    await initFaceApi("./models");
    modelStatus.textContent = "✅ Modelli caricati – pronto";
    modelStatus.style.color = "#059669";
    faceApiReady = true;
  } catch (e) {
    modelStatus.textContent = `❌ Errore: ${e.message}`;
    modelStatus.style.color = "#b91c1c";
  }
}

// ── Fetch immagine dal web via background ────────────────────────
function fetchImageAsDataUrl(url) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "FETCH_IMAGE_AS_DATAURL", url }, (resp) => {
      resolve(resp?.ok ? { ok: true, dataUrl: resp.dataUrl } : { ok: false, error: resp?.error });
    });
  });
}

// ── Carica immagine in uno slot ──────────────────────────────────
async function loadSlot(slot, dataUrl) {
  showErr(null);
  hideResult();

  const s = state[slot];
  s.dataUrl = dataUrl;
  s.faces = [];
  s.selectedIdx = 0;

  const prev = getPreview(slot);
  const picker = getPicker(slot);
  const hint = getHint(slot);
  const slotEl = getSlotEl(slot);

  prev.src = dataUrl;
  prev.style.display = "block";
  hint.style.display = "none";
  picker.innerHTML = "";
  slotEl.classList.add("has-image");
  slotEl.classList.remove("match-yes", "match-no");

  if (!faceApiReady) {
    showErr("Modelli non ancora caricati, attendi…");
    return;
  }

  // Disegna landmarks gialli sulla preview
  try {
    const annotated = await drawFaceLandmarks(dataUrl, "#FFD600");
    prev.src = annotated;
  } catch (e) {
    console.warn("[FaceCompare] Landmarks draw error:", e);
  }

  // Rileva volti
  try {
    s.faces = await extractAllFaces(dataUrl);
  } catch (e) {
    showErr(`Errore analisi volto ${slot}: ${e.message}`);
    return;
  }

  if (s.faces.length === 0) {
    showErr(`Nessun volto rilevato nell'immagine ${slot}`);
  } else if (s.faces.length > 1) {
    renderPicker(slot);
  }

  updateCompareBtn();
}

// ── Face picker per slot con più volti ───────────────────────────
function renderPicker(slot) {
  const s = state[slot];
  const picker = getPicker(slot);
  picker.innerHTML = "";

  s.faces.forEach((face, idx) => {
    const wrap = document.createElement("div");
    wrap.className = `face-thumb ${idx === s.selectedIdx ? "selected" : ""}`;
    wrap.dataset.idx = idx;

    const img = document.createElement("img");
    img.src = face.cropDataUrl;
    wrap.appendChild(img);

    wrap.addEventListener("click", () => {
      s.selectedIdx = idx;
      picker.querySelectorAll(".face-thumb").forEach((el, i) => {
        el.classList.toggle("selected", i === idx);
      });
      hideResult();
    });

    picker.appendChild(wrap);
  });
}

// ── Clear slot ───────────────────────────────────────────────────
function clearSlot(slot) {
  const s = state[slot];
  s.dataUrl = null;
  s.faces = [];
  s.selectedIdx = 0;

  getPreview(slot).style.display = "none";
  getPicker(slot).innerHTML = "";
  getHint(slot).style.display = "block";
  const slotEl = getSlotEl(slot);
  slotEl.classList.remove("has-image", "match-yes", "match-no");

  hideResult();
  updateCompareBtn();
}

// ── Compare button state ─────────────────────────────────────────
function updateCompareBtn() {
  const canCompare = faceApiReady
    && state.A.faces.length > 0
    && state.B.faces.length > 0;
  compareBtn.disabled = !canCompare;
}

// ── Nascondi risultato ───────────────────────────────────────────
function hideResult() {
  resultEl.style.display = "none";
  resultEl.className = "result";
  slotAEl.classList.remove("match-yes", "match-no");
  slotBEl.classList.remove("match-yes", "match-no");
}

// ── Confronto 1:1 ───────────────────────────────────────────────
function doCompare() {
  if (!faceApiReady || state.A.faces.length === 0 || state.B.faces.length === 0) return;

  const descA = state.A.faces[state.A.selectedIdx].descriptor;
  const descB = state.B.faces[state.B.selectedIdx].descriptor;
  const distance = compareDescriptors(descA, descB);

  // Similarità percentuale (0 = identici, 1+ = diversissimi)
  // Mappiamo: dist 0 → 100%, dist 1.0 → 0%
  const similarity = Math.max(0, Math.round((1 - distance) * 100));

  const isMatch = distance < 0.4;  // soglia sicura
  const isMaybe = distance >= 0.4 && distance < 0.6;

  resultEl.style.display = "block";

  if (isMatch) {
    resultEl.className = "result match";
    resultLabel.textContent = "✅ STESSA PERSONA";
    slotAEl.classList.add("match-yes");
    slotBEl.classList.add("match-yes");
  } else if (isMaybe) {
    resultEl.className = "result no-match";
    resultLabel.textContent = "⚠️ INCERTO – possibile match";
    slotAEl.classList.add("match-no");
    slotBEl.classList.add("match-no");
  } else {
    resultEl.className = "result no-match";
    resultLabel.textContent = "❌ PERSONE DIVERSE";
    slotAEl.classList.add("match-no");
    slotBEl.classList.add("match-no");
  }

  resultScore.textContent = `${similarity}%`;

  // Meter: colore in base a similarità
  const pct = Math.max(0, Math.min(100, similarity));
  meterFill.style.width = `${pct}%`;
  if (isMatch) {
    meterFill.style.background = "linear-gradient(90deg, #86efac, #22c55e)";
  } else if (isMaybe) {
    meterFill.style.background = "linear-gradient(90deg, #fde68a, #f59e0b)";
  } else {
    meterFill.style.background = "linear-gradient(90deg, #fca5a5, #ef4444)";
  }

  resultDetail.textContent = `Distanza euclidea: ${distance.toFixed(4)} · < 0.4 = match · 0.4–0.6 = incerto · > 0.6 = diversi`;
}

// ── File upload handlers ─────────────────────────────────────────
document.getElementById("uploadBtnA").addEventListener("click", () => fileA.click());
document.getElementById("uploadBtnB").addEventListener("click", () => fileB.click());

fileA.addEventListener("change", async () => {
  const file = fileA.files?.[0];
  if (!file) return;
  const dataUrl = await fileToDataUrl(file);
  await loadSlot("A", dataUrl);
  fileA.value = "";
});

fileB.addEventListener("change", async () => {
  const file = fileB.files?.[0];
  if (!file) return;
  const dataUrl = await fileToDataUrl(file);
  await loadSlot("B", dataUrl);
  fileB.value = "";
});

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

// ── Clear buttons ────────────────────────────────────────────────
document.getElementById("clearA").addEventListener("click", () => clearSlot("A"));
document.getElementById("clearB").addEventListener("click", () => clearSlot("B"));

// ── Compare button ───────────────────────────────────────────────
compareBtn.addEventListener("click", doCompare);

// ── Selezione dal web (via content script) ───────────────────────
async function loadSlotsFromTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  const resp = await chrome.tabs.sendMessage(tab.id, { type: "GET_SLOTS" }).catch(() => null);
  if (!resp?.slots) return;

  for (const slot of ["A", "B"]) {
    if (resp.slots[slot]?.srcUrl && !state[slot].dataUrl) {
      const fetched = await fetchImageAsDataUrl(resp.slots[slot].srcUrl);
      if (fetched.ok) {
        await loadSlot(slot, fetched.dataUrl);
      }
    }
  }
}

// ── Aggiornamento live da context menu ───────────────────────────
chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === "SLOT_UPDATED" && msg.data?.srcUrl) {
    const fetched = await fetchImageAsDataUrl(msg.data.srcUrl);
    if (fetched.ok) {
      await loadSlot(msg.slot, fetched.dataUrl);
    }
  }
});

// ── Init ─────────────────────────────────────────────────────────
(async function init() {
  await loadModels();
  await loadSlotsFromTab();
})();
