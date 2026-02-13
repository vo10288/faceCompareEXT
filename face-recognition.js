/* face-recognition.js – Face Compare 1:1 */

/* global faceapi */

let modelsLoaded = false;

export async function initFaceApi(modelPath) {
  if (modelsLoaded) return;
  await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
  await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);
  modelsLoaded = true;
  console.log("[FaceCompare] Modelli caricati ✓");
}

export async function detectFaces(input) {
  return faceapi
    .detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();
}

/**
 * Rileva tutti i volti e restituisce array di { descriptor, box, cropDataUrl }
 */
export async function extractAllFaces(dataUrl) {
  const img = await loadImage(dataUrl);
  const detections = await detectFaces(img);
  if (detections.length === 0) return [];

  const results = [];
  for (const det of detections) {
    const box = det.detection.box;
    const pad = 0.25;
    const x = Math.max(0, Math.round(box.x - box.width * pad));
    const y = Math.max(0, Math.round(box.y - box.height * pad));
    const w = Math.min(img.naturalWidth - x, Math.round(box.width * (1 + pad * 2)));
    const h = Math.min(img.naturalHeight - y, Math.round(box.height * (1 + pad * 2)));

    const canvas = document.createElement("canvas");
    const size = 128;
    canvas.width = size; canvas.height = size;
    canvas.getContext("2d", { alpha: false }).drawImage(img, x, y, w, h, 0, 0, size, size);

    results.push({
      descriptor: det.descriptor,
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      cropDataUrl: canvas.toDataURL("image/jpeg", 0.9)
    });
  }

  results.sort((a, b) => (b.box.width * b.box.height) - (a.box.width * a.box.height));
  return results;
}

/**
 * Calcola distanza euclidea tra due descriptor
 */
export function compareDescriptors(descA, descB) {
  const a = descA instanceof Float32Array ? descA : new Float32Array(descA);
  const b = descB instanceof Float32Array ? descB : new Float32Array(descB);
  return faceapi.euclideanDistance(a, b);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossibile caricare immagine"));
    img.src = src;
  });
}

/**
 * Disegna rettangoli e 68 face landmarks su un'immagine.
 * @param {string} dataUrl – immagine sorgente
 * @param {string} color – colore CSS (default: giallo intenso)
 * @returns {Promise<string>} dataUrl annotato
 */
export async function drawFaceLandmarks(dataUrl, color = "#FFD600") {
  const img = await loadImage(dataUrl);
  const detections = await detectFaces(img);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  for (const det of detections) {
    const box = det.detection.box;

    // Rettangolo volto
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, Math.round(Math.min(canvas.width, canvas.height) / 200));
    ctx.setLineDash([]);
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    // 68 Landmarks – punti
    const points = det.landmarks.positions;
    const dotSize = Math.max(1.5, Math.round(Math.min(canvas.width, canvas.height) / 300));

    ctx.fillStyle = color;
    for (const pt of points) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Linee di connessione
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, dotSize * 0.6);
    ctx.globalAlpha = 0.7;

    const groups = [
      [...Array(17).keys()],             // contorno viso
      [17, 18, 19, 20, 21],              // sopracciglio sx
      [22, 23, 24, 25, 26],              // sopracciglio dx
      [27, 28, 29, 30],                  // naso ponte
      [31, 32, 33, 34, 35],              // naso base
      [36, 37, 38, 39, 40, 41, 36],      // occhio sx
      [42, 43, 44, 45, 46, 47, 42],      // occhio dx
      [48,49,50,51,52,53,54,55,56,57,58,59,48], // labbro esterno
      [60, 61, 62, 63, 64, 65, 66, 67, 60]      // labbro interno
    ];

    for (const group of groups) {
      ctx.beginPath();
      for (let i = 0; i < group.length; i++) {
        const pt = points[group[i]];
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1.0;
  }

  return canvas.toDataURL("image/jpeg", 0.92);
}
