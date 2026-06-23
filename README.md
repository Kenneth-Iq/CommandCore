# Jarvis Platform

A self-hosted multi-agent platform: you command, Jarvis Prime orchestrates, a fleet of role agents executes.

| Folder | What it is |
|---|---|
| `app\` | Command Bridge — Electron desktop app (voice + dashboard) |
| `core\` | Jarvis Core — Python FastAPI service embedding the Hermes agent engine |
| `services\` | Workspace services deployment data (Odysseus) |
| `docker\` | Compose stack for Core + Odysseus + ChromaDB + SearXNG + ntfy |

Documents: [VISION.md](VISION.md) (architecture + roadmap) · [PHASE-0-1.md](PHASE-0-1.md) (current phase spec) · [PRD.md](PRD.md) (original single-agent spec, superseded for architecture).

## Quick start (dev)

```powershell
# Core (mock engine, no API key needed)
cd core
python -m venv .venv; .venv\Scripts\Activate.ps1
pip install -e .[dev]
$env:JARVIS_ENGINE = "mock"
python -m jarvis_core

# Command Bridge
cd ..\app
npm install
npm run dev
```

For the real engine: `pip install -e C:\Projects\Hermes-agent`, set `NVIDIA_API_KEY`, drop `JARVIS_ENGINE` (defaults to `hermes`).

## Quick start (docker)

```powershell
cd docker
copy .env.example .env   # fill in keys
docker compose up -d --build
```
