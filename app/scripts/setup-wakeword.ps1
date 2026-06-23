# Jarvis - Wake word setup script
# Downloads official openWakeWord models and trains a custom hey_jarvis model using Piper TTS
# Run from the project root: .\scripts\setup-wakeword.ps1

$ErrorActionPreference = 'Stop'

$scriptDir   = $PSScriptRoot
$projectRoot = Split-Path $scriptDir -Parent
$owwDir      = Join-Path $projectRoot 'resources\openwakeword'
$modelTarget = Join-Path $owwDir 'hey_jarvis.onnx'

# Step 1 - check Piper is available (we use it for TTS synthesis)
$piperExe   = Join-Path $projectRoot 'resources\piper\piper.exe'
$voiceModel = Join-Path $projectRoot 'resources\piper\voices\en_US-lessac-medium.onnx'

if (-not (Test-Path $piperExe)) {
    Write-Warning 'Piper not found. Run .\scripts\setup-piper.ps1 first.'
    exit 1
}

# Step 2 - download official openWakeWord pre-trained models (needed as negative examples)
Write-Host 'Downloading official openWakeWord models...' -ForegroundColor Yellow
python -c "from openwakeword.utils import download_models; download_models()"
Write-Host 'Official models downloaded.' -ForegroundColor Green

# Step 3 - train the hey_jarvis model
Write-Host ''
Write-Host 'Training hey_jarvis model using Piper TTS...' -ForegroundColor Yellow
Write-Host '(This takes a few minutes)'

$trainScript = Join-Path $owwDir 'train_hey_jarvis.py'

python $trainScript `
    --piper-exe $piperExe `
    --voice-model $voiceModel `
    --output $modelTarget

if (Test-Path $modelTarget) {
    Write-Host ''
    Write-Host "hey_jarvis.onnx written to $modelTarget" -ForegroundColor Green
    Write-Host 'Restart npm run dev - wake word detection is now active.' -ForegroundColor Cyan
} else {
    Write-Error 'Training failed - hey_jarvis.onnx was not produced.'
}
