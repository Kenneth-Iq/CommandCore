# Nexus Console Runbook

## Purpose

This runbook explains how to start the read-only CommandCore API and the Nexus Console live operations dashboard together for Alpha-5.

## 1. Start the CommandCore API

From the repository root:

```bash
cd core
python3 -m uvicorn commandcore.api.app:app --host 0.0.0.0 --port 8008
```

Local API example:

```text
http://127.0.0.1:8008
```

## 2. Start Nexus Console

From the repository root:

```bash
cd apps/nexus-console
VITE_COMMANDCORE_API_URL=http://127.0.0.1:8008 npm run dev
```

If you want the Vite dev server reachable from another machine:

```bash
cd apps/nexus-console
VITE_COMMANDCORE_API_URL=http://YOUR_SERVER_IP:8008 npm run dev:host
```

## 3. Production Build Check

```bash
cd apps/nexus-console
npm run build
```

## 4. Environment Variable

Nexus Console reads the API base URL from:

```text
VITE_COMMANDCORE_API_URL
```

Examples:

```bash
VITE_COMMANDCORE_API_URL=http://127.0.0.1:8008 npm run dev
VITE_COMMANDCORE_API_URL=http://192.168.1.50:8008 npm run dev:host
```

Behavior:

- If the API is reachable, Nexus shows `Live API`.
- If the API is unreachable or the variable is missing, Nexus falls back to `Mock Data`.

## 5. Remote Server Access Example

Example remote host setup:

```text
API server:  http://192.168.1.50:8008
Vite UI:     http://192.168.1.50:5173
```

Steps:

1. Start the API with `--host 0.0.0.0`.
2. Start Nexus with `npm run dev:host`.
3. Set `VITE_COMMANDCORE_API_URL` to the API server IP and port.
4. Open the Vite URL from the remote browser.

## 6. Troubleshooting

### Live API badge does not appear

- Confirm `VITE_COMMANDCORE_API_URL` is set.
- Confirm the API process is running.
- Open `http://HOST:PORT/health` directly in the browser.

### Frontend works locally but remote browser cannot connect

- `localhost` only works from the same machine.
- Use the actual server IP instead of `127.0.0.1` or `localhost` for remote browsers.
- Start Vite with `npm run dev:host`.

### API reachable on server but not from another machine

- Verify the API was started with `--host 0.0.0.0`.
- Verify firewall/security-group rules allow port `8008`.
- Verify the remote machine can reach the server IP.

## 7. Notes

- The API is read-only for this milestone.
- No backend write routes are exposed.
- No auth, database, AI calls, or external services are required.
