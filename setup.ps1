# setup.ps1 – Scarica face-api.min.js e modelli per Face Compare 1:1
$ErrorActionPreference = "Stop"
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $dir

Write-Host "=== Face Compare 1:1 - Setup ===" -ForegroundColor Cyan

Write-Host "[1/2] Scarico face-api.min.js ..."
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js" -OutFile "face-api.min.js"
Write-Host "      OK" -ForegroundColor Green

Write-Host "[2/2] Scarico modelli (~6 MB) ..."
New-Item -ItemType Directory -Path "models" -Force | Out-Null

$base = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
$files = @(
  "ssd_mobilenetv1_model-shard1",
  "ssd_mobilenetv1_model-shard2",
  "ssd_mobilenetv1_model-weights_manifest.json",
  "face_landmark_68_model-shard1",
  "face_landmark_68_model-weights_manifest.json",
  "face_recognition_model-shard1",
  "face_recognition_model-shard2",
  "face_recognition_model-weights_manifest.json"
)

foreach ($f in $files) {
  Write-Host "      -> $f"
  Invoke-WebRequest -Uri "$base/$f" -OutFile "models\$f"
}

Write-Host ""
Write-Host "=== Setup completato! ===" -ForegroundColor Green
Write-Host "Carica in Chrome/Edge: chrome://extensions -> Carica estensione non pacchettizzata -> $dir"
Read-Host "Premi Invio per chiudere"
