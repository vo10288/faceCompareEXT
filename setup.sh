#!/usr/bin/env bash
# setup.sh – Scarica face-api.min.js e modelli per Face Compare 1:1
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Face Compare 1:1 – Setup ==="
echo ""

echo "[1/2] Scarico face-api.min.js …"
curl -sL -o face-api.min.js \
  "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"
echo "      ✓ face-api.min.js"

echo "[2/2] Scarico modelli (~6 MB) …"
mkdir -p models
BASE="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

for f in \
  ssd_mobilenetv1_model-shard1 \
  ssd_mobilenetv1_model-shard2 \
  ssd_mobilenetv1_model-weights_manifest.json \
  face_landmark_68_model-shard1 \
  face_landmark_68_model-weights_manifest.json \
  face_recognition_model-shard1 \
  face_recognition_model-shard2 \
  face_recognition_model-weights_manifest.json
do
  echo "      → $f"
  curl -sL -o "models/$f" "$BASE/$f"
done

echo ""
echo "=== Setup completato! ==="
echo "Carica in Chrome: chrome://extensions → Carica estensione non pacchettizzata → $SCRIPT_DIR"
