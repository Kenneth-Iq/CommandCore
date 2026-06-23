# Jarvis — Phase 1 Setup

## 1. Prerequisites

- Node.js 20+ and npm 10+
- Python 3.11+ (for openWakeWord voice detection only)

## 2. NVIDIA API Key

Get a free API key from https://build.nvidia.com

Add it to your environment (PowerShell):
```powershell
$env:NVIDIA_API_KEY = "nvapi-xxxxxxxxxxxx"
```

For persistence, add to your PowerShell profile or Windows environment variables.

## 3. Install Node dependencies

```powershell
cd C:\Projects\Jarvis
npm install
```

`postinstall` will automatically rebuild `better-sqlite3` for Electron.

## 4. Check available NVIDIA NIM models

Run once to see which LLM models are free:
```powershell
$env:NVIDIA_API_KEY = "nvapi-xxxxxxxxxxxx"
node -e "
const OpenAI = require('openai');
const c = new OpenAI({ baseURL: 'https://integrate.api.nvidia.com/v1', apiKey: process.env.NVIDIA_API_KEY });
c.models.list().then(r => r.data.forEach(m => console.log(m.id)));
"
```

Update `C:\jarvis\config\jarvis.yaml` → `llm.model` with your chosen model.

## 5. Set up Piper TTS

Download the Piper Windows release and a voice model:
```
https://github.com/rhasspy/piper/releases
```

Create the directory structure:
```
resources\piper\
  piper.exe
  voices\
    en_US-lessac-medium.onnx
    en_US-lessac-medium.onnx.json
```

Download the `en_US-lessac-medium` voice files from:
```
https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/lessac/medium
```

## 6. Set up openWakeWord (optional — keyboard shortcut works without it)

```powershell
pip install openwakeword pyaudio numpy
```

For a "Hey Jarvis" model, either:
- Train a custom model: https://github.com/dscripka/openWakeWord#training-new-models
- Or use a pre-trained model from: https://github.com/dscripka/openWakeWord#pre-trained-models

Place the `.onnx` model file at:
```
resources\openwakeword\hey_jarvis.onnx
```

## 7. Run in development mode

```powershell
$env:NVIDIA_API_KEY = "nvapi-xxxxxxxxxxxx"
npm run dev
```

The compact overlay appears in the bottom-right corner.

**Keyboard shortcuts:**
- `Ctrl+Shift+J` — toggle overlay visibility  
- `Ctrl+Shift+Space` — activate listen mode (mic)

## 8. Phase 1 success test

Say or type: *"Create a file called test.md with the text Hello World"*

Expected: `C:\jarvis\notes\test.md` is created.

Then: *"Read test.md"* — Jarvis reads it back.
