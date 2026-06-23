# Jarvis - Piper TTS setup script
# Downloads piper.exe and the en_US-lessac-medium voice model
# Run from the project root: .\scripts\setup-piper.ps1

$ErrorActionPreference = 'Stop'

$piperDir  = Join-Path $PSScriptRoot '..\resources\piper'
$voicesDir = Join-Path $piperDir 'voices'

New-Item -ItemType Directory -Force -Path $piperDir  | Out-Null
New-Item -ItemType Directory -Force -Path $voicesDir | Out-Null

# ------------------------------------------------------------
# 1. Piper executable
# ------------------------------------------------------------
$piperExe = Join-Path $piperDir 'piper.exe'

if (Test-Path $piperExe) {
    Write-Host 'piper.exe already present - skipping download.' -ForegroundColor Cyan
} else {
    Write-Host 'Downloading piper.exe...' -ForegroundColor Yellow

    $releaseApi = 'https://api.github.com/repos/rhasspy/piper/releases/latest'
    $release    = Invoke-RestMethod -Uri $releaseApi -Headers @{ 'User-Agent' = 'jarvis-setup' }
    $asset      = $release.assets | Where-Object { $_.name -match 'windows_amd64\.zip$' } | Select-Object -First 1

    if (-not $asset) {
        Write-Error 'Could not find a windows_amd64 release asset. Check https://github.com/rhasspy/piper/releases manually.'
    }

    $zipPath = Join-Path $env:TEMP 'piper_windows.zip'
    Write-Host "  -> $($asset.browser_download_url)"
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zipPath

    Write-Host 'Extracting...'
    $extractDir = Join-Path $env:TEMP 'piper_extract'
    Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

    $exeSource = Get-ChildItem -Path $extractDir -Filter 'piper.exe' -Recurse | Select-Object -First 1
    if (-not $exeSource) { Write-Error 'piper.exe not found in zip.' }
    Copy-Item -Path $exeSource.FullName -Destination $piperExe

    # espeak-ng-data must sit next to piper.exe
    $espeakSource = Get-ChildItem -Path $extractDir -Filter 'espeak-ng-data' -Recurse -Directory | Select-Object -First 1
    if ($espeakSource) {
        Copy-Item -Path $espeakSource.FullName -Destination (Join-Path $piperDir 'espeak-ng-data') -Recurse -Force
    }

    Remove-Item $zipPath -Force
    Remove-Item $extractDir -Recurse -Force

    Write-Host 'piper.exe installed.' -ForegroundColor Green
}

# ------------------------------------------------------------
# 2. Voice model (en_US-lessac-medium)
# ------------------------------------------------------------
$voiceName  = 'en_US-lessac-medium'
$onnxFile   = Join-Path $voicesDir "$voiceName.onnx"
$configFile = Join-Path $voicesDir "$voiceName.onnx.json"
$hfBase     = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium'

if (Test-Path $onnxFile) {
    Write-Host "$voiceName.onnx already present - skipping." -ForegroundColor Cyan
} else {
    Write-Host "Downloading $voiceName.onnx (~63 MB)..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "$hfBase/$voiceName.onnx" -OutFile $onnxFile
    Write-Host 'Voice model downloaded.' -ForegroundColor Green
}

if (Test-Path $configFile) {
    Write-Host "$voiceName.onnx.json already present - skipping." -ForegroundColor Cyan
} else {
    Write-Host "Downloading $voiceName.onnx.json..."
    Invoke-WebRequest -Uri "$hfBase/$voiceName.onnx.json" -OutFile $configFile
    Write-Host 'Voice config downloaded.' -ForegroundColor Green
}

# ------------------------------------------------------------
# 3. Smoke test
# ------------------------------------------------------------
Write-Host ''
Write-Host 'Testing Piper...' -ForegroundColor Yellow
$testWav = Join-Path $env:TEMP 'jarvis_test.wav'
'Jarvis is ready.' | & $piperExe --model $onnxFile --output_file $testWav

if (Test-Path $testWav) {
    Write-Host "Smoke test passed. WAV written to $testWav" -ForegroundColor Green
    Remove-Item $testWav -Force
} else {
    Write-Warning 'Piper ran but produced no WAV - check that espeak-ng-data folder is next to piper.exe.'
}

Write-Host ''
Write-Host 'Done. Restart npm run dev to enable TTS.' -ForegroundColor Cyan
