# 02 - Folder Structure

## Repository Summary

The repository is organized as a legacy Jarvis platform with emerging CommandCore documentation.

```text
.
  app/
  core/
  docker/
  docs/
  services/
```

## Module: `app/`

### Purpose

Electron desktop client and local fallback agent runtime.

### Responsibilities

- Start Electron windows and tray.
- Provide overlay and expanded panel UI.
- Handle IPC, credentials, local tools, voice, feeds, integrations, and Core connectivity.
- Build renderer assets with electron-vite.

### Dependencies

- Electron, React, Zustand, OpenAI SDK, WebSocket client, sql.js, ssh2, js-yaml.
- External APIs for Graph, Twitter/X, LinkedIn, Open-Meteo, Frankfurter, Yahoo Finance, ArXiv, Reddit, RSS, NVIDIA NIM, Ollama.

### Strengths

- Clear high-level split between `src/main`, `src/preload`, and `src/renderer`.
- Command Bridge components are isolated under `renderer/src/command-bridge`.
- Resources and setup scripts are kept with the app.

### Weaknesses

- `src/main/ipc.js` is a large multipurpose module.
- Integration registration happens centrally and grows horizontally.
- UI contains both older tabbed panel and newer Command Bridge surfaces.

### Should Keep

- Electron process folder split.
- `command-bridge` component isolation.
- Resource scripts for Piper and wake word setup.

### Should Improve

- Document main-process domains and IPC channel ownership.
- Add module-level READMEs if implementation continues in this structure.

### Should Replace

- Replace single large IPC registration file with domain-owned IPC registration over time, preserving existing channels.

## Module: `core/`

### Purpose

Python mission orchestration service.

### Responsibilities

- Package `jarvis_core`.
- Define FastAPI app, engine abstraction, ledger, mission manager, scheduler, Telegram bridge, Odysseus client, and tests.
- Store role and schedule YAML configuration.

### Dependencies

- Python 3.11+, FastAPI, Uvicorn, Pydantic, PyYAML, httpx, croniter, pytest.
- Optional Hermes package.

### Strengths

- Clean package boundary under `jarvis_core`.
- Tests are colocated and cover major runtime behavior.
- Roles and prompts are data files under `agents/`.

### Weaknesses

- `jarvis_core` package name remains legacy.
- Ledger schema and migration logic are embedded in application code.
- External Hermes import is not represented in `pyproject.toml` dependencies.

### Should Keep

- Package layout.
- `agents/roles.yaml` and prompt files.
- Test suite.
- `engine/` abstraction folder.

### Should Improve

- Make optional external engine dependency documentation explicit.
- Separate schema/migration documentation from runtime code.

### Should Replace

- Replace implicit phase comments as the primary architecture guide with stable architecture docs while keeping phase docs as history.

## Module: `docker/`

### Purpose

Container orchestration for local/self-hosted platform services.

### Responsibilities

- Build Core.
- Run Odysseus, ChromaDB, SearXNG, and ntfy.
- Bind service ports to localhost.
- Mount persistent data.

### Dependencies

- Docker Compose.
- Sibling Odysseus repository.
- External container images.

### Strengths

- Single compose entrypoint.
- Environment-variable driven configuration.
- Localhost exposure is conservative.

### Weaknesses

- References files outside this repository.
- Not fully aligned with newer X10 infrastructure vocabulary.

### Should Keep

- Compose stack as operational documentation.
- Localhost defaults.

### Should Improve

- Add explicit setup expectations for sibling Odysseus checkout.
- Document data ownership for mounted directories.

### Should Replace

- Replace undocumented external path assumptions with explicit documented prerequisites.

## Module: `docs/`

### Purpose

Product, blueprint, legacy, and architecture documentation.

### Responsibilities

- Preserve original Jarvis phase history.
- Store new CommandCore PRD and blueprint direction.
- Hold this architecture archaeology output.

### Dependencies

- None at runtime.

### Strengths

- Legacy phase docs are detailed and map closely to implemented behavior.
- New product/blueprint docs preserve future direction.

### Weaknesses

- README links point to root docs that now live under `docs/legacy/jarvis/`.
- Legacy and current naming coexist without a formal naming map.

### Should Keep

- Legacy phase docs.
- Product and blueprint docs.

### Should Improve

- Add index documents that point readers to canonical current docs.
- Document Jarvis-to-CommandCore naming explicitly.

### Should Replace

- Replace stale root-relative doc references with accurate paths in a future documentation cleanup.

## Module: `services/`

### Purpose

Persisted local runtime data for Core and Odysseus services.

### Responsibilities

- Store Core ledger files under `services/core-data`.
- Store Odysseus app data, auth, settings, memory, research sessions, logs, and databases.

### Dependencies

- Docker Compose mounts.
- Odysseus runtime.

### Strengths

- Makes local runtime state inspectable.
- Separates service data from source directories.

### Weaknesses

- Contains runtime databases and secrets-like artifacts in the working tree.
- Not source code but appears in repository file traversal.

### Should Keep

- Data directory concept for local deployment.

### Should Improve

- Establish repository policy for committed versus local-only service data.

### Should Replace

- Replace accidental versioning of runtime data with documented local data initialization and backup practices, preserving the data capability.
