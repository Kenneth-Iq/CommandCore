"""Jarvis Core — mission orchestration service.

Layers (see PHASE-0-1.md):
  ledger    — SQLite persistence (missions, events, approvals, actions)
  events    — EventHub broadcasting typed events to WebSocket clients
  approvals — ApprovalBroker bridging engine threads to commander decisions
  missions  — MissionManager running engines and translating callbacks
  engine    — Engine seam: HermesEngine (production) / MockEngine (tests, dev)
"""

__version__ = "0.1.0"
