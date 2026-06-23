# 06 - Desktop Architecture

## Desktop Runtime Overview

The desktop app is an Electron application with:

- Main process for windows, tray, IPC, credentials, voice, integrations, Core connectivity, and fallback agent loop.
- Preload bridge exposing `window.jarvis`.
- React renderer for overlay, expanded panel, Command Bridge, confirmations, files, missions, integrations, and logs.

## Module: Electron Main Process

### Purpose

Host the desktop runtime and privileged operations.

### Responsibilities

- Create tray, overlay, and expanded panel windows.
- Register global shortcuts.
- Initialize config, sandbox, log, IPC, voice, and alerts.
- Validate model configuration.
- Broadcast events to all renderer windows.

### Dependencies

- Electron app/window/tray APIs, config, log, IPC, voice pipeline, credentials, LLM, alerts.

### Strengths

- Keeps app resident in tray.
- Overlay and expanded panel are separate windows.
- Startup opens setup when API key is missing.

### Weaknesses

- Startup sequence mixes many concerns.
- Window titles and copy still use Jarvis.
- Global shortcuts are fixed.

### Should Keep

- Tray-resident behavior.
- Overlay plus expanded panel pattern.
- Broadcast helper.

### Should Improve

- Split startup concerns into documented lifecycle phases.
- Make shortcut configuration visible in settings.

### Should Replace

- Replace hard-coded Jarvis copy with a compatibility-aware naming layer when the product rename is ready.

## Module: Preload Bridge

### Purpose

Expose safe renderer API under `window.jarvis`.

### Responsibilities

- Proxy IPC invokes and events.
- Hide Node APIs from renderer.
- Provide Core, file, credential, config, voice, undo, Ollama, and event methods.

### Dependencies

- Electron `contextBridge` and `ipcRenderer`.

### Strengths

- Renderer API is explicit.
- Context isolation is used.

### Weaknesses

- Large flat API surface.
- Cleanup removes all listeners for a channel.

### Should Keep

- `window.jarvis` bridge pattern.

### Should Improve

- Group API functions by domain in documentation.
- Use safer unsubscribe patterns if multiple listeners become common.

### Should Replace

- Replace flat bridge growth with namespaced bridge objects while preserving existing methods.

## Module: Renderer UI

### Purpose

Render user interaction surfaces.

### Responsibilities

- Overlay for compact voice/status response.
- Expanded panel for tabs.
- Command Bridge for mission-control view.
- Confirmation dialogs.
- API key setup.

### Dependencies

- React, renderer components, preload API, Zustand store, CSS.

### Strengths

- Clear setup, overlay, expanded-panel split.
- Command Bridge is event-driven and visually separated.
- Expanded panel preserves older operational tabs.

### Weaknesses

- Two UI generations coexist.
- Some state is local React state, some is Zustand, some is main-process state.
- TTS completion comment notes missing direct callback.

### Should Keep

- Overlay and expanded panel.
- Command Bridge as live mission UI.
- Confirmation dialog.

### Should Improve

- Document state ownership between main, Zustand, and component state.
- Make the older/newer UI relationship explicit.

### Should Replace

- Replace duplicated mission state in `ExpandedPanel` and Zustand with a shared renderer state source when practical.

## Module: Voice Pipeline

### Purpose

Enable wake word or shortcut-driven voice interaction.

### Responsibilities

- Initialize STT and TTS.
- Start openWakeWord subprocess if available.
- Transcribe renderer audio with NVIDIA NIM-compatible API.
- Send transcript through message handler.
- Synthesize response with Piper if available.

### Dependencies

- OpenAI SDK, NVIDIA NIM ASR, Piper executable/resources, openWakeWord script, Electron IPC events.

### Strengths

- Gracefully disables wake word and TTS when resources are missing.
- Shortcut activation remains available.
- Voice states are broadcast to UI.

### Weaknesses

- Wake word subprocess invokes `python`, not `python3`.
- Temporary audio file is written but transcription uses buffer via `toFile`.
- Main/renderer speaking completion is not fully wired.

### Should Keep

- Optional wake word and Piper model.
- State machine: idle/listening/processing/speaking.

### Should Improve

- Document setup dependencies.
- Complete speaking-finished callback path.

### Should Replace

- Replace platform-specific subprocess assumptions with configurable interpreter/resource paths.

## Module: Desktop Integrations

### Purpose

Provide tools for calendar, email, server monitoring, research feeds, memory, social posting, Ollama, feeds, and alerts.

### Responsibilities

- Register tool definitions for LLM tool calling.
- Execute external API or local file operations.
- Enforce local confirmation tier through tool registry.

### Dependencies

- Microsoft Graph, SSH, public web APIs, social APIs, sandbox, credentials, config.

### Strengths

- Broad capability set.
- Tools carry tier metadata.
- Sensitive outward actions require confirmation or double confirmation.

### Weaknesses

- Tool implementations are tightly coupled to Electron main process.
- Some parsing is manual regex/XML parsing.
- Some integrations are best-effort and not heavily tested in repo.

### Should Keep

- Tool registry model.
- Tier metadata.
- Integration modules as separate files.

### Should Improve

- Add integration health/status contracts.
- Add tests or fixtures for critical integrations.

### Should Replace

- Replace fragile manual feed parsing with robust parsers if feed reliability becomes important.
