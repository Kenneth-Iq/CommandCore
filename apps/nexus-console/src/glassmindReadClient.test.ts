import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  fetchGlassmindReadiness,
  fetchMemoryByScope,
  fetchMemoryBySourceReference,
  fetchMemoryTrace,
  type GlassmindReadClientConfig,
  type GlassmindReadClientFetch,
} from "./glassmindReadClient.js";

const BASE_URL = "https://example.invalid/glassmind-api";

type RecordedCall = { url: string; init: RequestInit };

function buildFakeFetch(responseBody: unknown, ok = true, status = 200): { fetchImpl: GlassmindReadClientFetch; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const fetchImpl: GlassmindReadClientFetch = async (url, init) => {
    calls.push({ url, init });
    return { ok, status, json: async () => responseBody };
  };
  return { fetchImpl, calls };
}

function buildConfig(fetchImpl: GlassmindReadClientFetch): GlassmindReadClientConfig {
  return { baseUrl: BASE_URL, fetchImpl };
}

describe("glassmindReadClient — calls the expected GET URL/query shape", () => {
  it("fetchMemoryBySourceReference calls the by-source-reference endpoint with the right query", async () => {
    const { fetchImpl, calls } = buildFakeFetch({ status: "no_memory_found" });

    await fetchMemoryBySourceReference({ conversationId: "conv-1", eventId: "evt-1" }, buildConfig(fetchImpl));

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${BASE_URL}/glassmind/memory/by-source-reference?conversationId=conv-1&eventId=evt-1`);
    expect(calls[0].init.method).toBe("GET");
  });

  it("fetchMemoryByScope calls the by-scope endpoint with the right query", async () => {
    const { fetchImpl, calls } = buildFakeFetch({ status: "no_memory_found" });

    await fetchMemoryByScope({ entityKind: "mission", entityId: "m-1" }, buildConfig(fetchImpl));

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${BASE_URL}/glassmind/memory/by-scope?entityKind=mission&entityId=m-1`);
    expect(calls[0].init.method).toBe("GET");
  });

  it("fetchMemoryTrace calls the trace endpoint with the right query", async () => {
    const { fetchImpl, calls } = buildFakeFetch({ status: "no_memory_found" });

    await fetchMemoryTrace({ entityKind: "mission", entityId: "m-1" }, buildConfig(fetchImpl));

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${BASE_URL}/glassmind/memory/trace?entityKind=mission&entityId=m-1`);
    expect(calls[0].init.method).toBe("GET");
  });

  it("fetchGlassmindReadiness calls the readiness endpoint with no query", async () => {
    const { fetchImpl, calls } = buildFakeFetch({ ready: true });

    await fetchGlassmindReadiness(buildConfig(fetchImpl));

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${BASE_URL}/glassmind/health/readiness`);
    expect(calls[0].init.method).toBe("GET");
  });
});

describe("glassmindReadClient — found responses map to Nexus-safe found view models", () => {
  it("maps a found by-scope response into NexusMemoryRecordView entries", async () => {
    const { fetchImpl } = buildFakeFetch({
      status: "found",
      recordCount: 1,
      records: [
        {
          id: "followup-1",
          kind: "follow_up",
          text: "Should I reassign this mission?",
          occurredAt: "2026-06-30T00:00:00.000Z",
          evidence: { label: "Mission Detail", page: "missions" },
        },
      ],
    });

    const result = await fetchMemoryByScope({ entityKind: "mission", entityId: "m-1" }, buildConfig(fetchImpl));

    expect(result).toEqual({
      state: "found",
      recordCount: 1,
      records: [
        {
          kind: "follow_up",
          summary: "Should I reassign this mission?",
          occurredAt: "2026-06-30T00:00:00.000Z",
          evidence: { label: "Mission Detail", page: "missions", selection: undefined },
        },
      ],
    });
  });

  it("maps a found trace response into NexusTraceItemView entries, preserving lifecycle fields", async () => {
    const { fetchImpl } = buildFakeFetch({
      status: "found",
      recordCount: 1,
      records: [
        {
          kind: "deferred_decision",
          occurredAt: "2026-06-30T02:00:00.000Z",
          lifecycleStatus: "completed",
          lifecycleAt: "2026-06-30T03:00:00.000Z",
          record: { id: "decision-1", kind: "deferred_decision", title: "Review blocked mission", detail: "Needs attention.", occurredAt: "2026-06-30T02:00:00.000Z" },
        },
      ],
    });

    const result = await fetchMemoryTrace({ entityKind: "mission", entityId: "m-1" }, buildConfig(fetchImpl));

    expect(result).toEqual({
      state: "found",
      recordCount: 1,
      items: [
        {
          kind: "deferred_decision",
          occurredAt: "2026-06-30T02:00:00.000Z",
          lifecycleStatus: "completed",
          lifecycleAt: "2026-06-30T03:00:00.000Z",
          summary: "Review blocked mission: Needs attention.",
          evidence: undefined,
        },
      ],
    });
  });

  it("does not fabricate evidence for a record that carried none", async () => {
    const { fetchImpl } = buildFakeFetch({
      status: "found",
      recordCount: 1,
      records: [{ id: "decision-1", kind: "deferred_decision", title: "Review blocked mission", detail: "Needs attention.", occurredAt: "2026-06-30T02:00:00.000Z" }],
    });

    const result = await fetchMemoryByScope({ entityKind: "mission", entityId: "m-1" }, buildConfig(fetchImpl));

    expect(result).toMatchObject({ state: "found" });
    if (result.state === "found") {
      expect(result.records[0].evidence).toBeUndefined();
    }
  });
});

describe("glassmindReadClient — empty/no_memory_found responses map honestly", () => {
  it("maps a no_memory_found by-source-reference response", async () => {
    const { fetchImpl } = buildFakeFetch({ status: "no_memory_found" });

    const result = await fetchMemoryBySourceReference({ eventId: "no-such-event" }, buildConfig(fetchImpl));

    expect(result).toEqual({ state: "no_memory_found" });
  });

  it("maps a no_memory_found trace response", async () => {
    const { fetchImpl } = buildFakeFetch({ status: "no_memory_found" });

    const result = await fetchMemoryTrace({ entityKind: "mission", entityId: "no-such-mission" }, buildConfig(fetchImpl));

    expect(result).toEqual({ state: "no_memory_found" });
  });
});

describe("glassmindReadClient — backend_unavailable maps to unavailable", () => {
  it("maps a backend_unavailable error response to the unavailable state", async () => {
    const { fetchImpl } = buildFakeFetch({ status: "error", error: { code: "backend_unavailable", message: "Store unreachable." } });

    const result = await fetchMemoryByScope({ entityKind: "mission", entityId: "m-1" }, buildConfig(fetchImpl));

    expect(result.state).toBe("unavailable");
    if (result.state === "unavailable") {
      expect(result.reason).toContain("backend_unavailable");
    }
  });

  it("maps a network/HTTP failure to the unavailable state, never throwing", async () => {
    const { fetchImpl } = buildFakeFetch({}, false, 503);

    let result: Awaited<ReturnType<typeof fetchMemoryByScope>> | undefined;
    await expect(
      (async () => {
        result = await fetchMemoryByScope({ entityKind: "mission", entityId: "m-1" }, buildConfig(fetchImpl));
      })(),
    ).resolves.not.toThrow();

    expect(result?.state).toBe("unavailable");
  });
});

describe("glassmindReadClient — permission_denied maps to unavailable", () => {
  it("maps a permission_denied error response to the unavailable state", async () => {
    const { fetchImpl } = buildFakeFetch({ status: "error", error: { code: "permission_denied", message: "Not authorized." } });

    const result = await fetchMemoryBySourceReference({ conversationId: "conv-1" }, buildConfig(fetchImpl));

    expect(result.state).toBe("unavailable");
    if (result.state === "unavailable") {
      expect(result.reason).toContain("permission_denied");
    }
  });
});

describe("glassmindReadClient — invalid_request is handled safely", () => {
  it("maps an invalid_request error response to the unavailable state, without throwing", async () => {
    const { fetchImpl } = buildFakeFetch({ status: "error", error: { code: "invalid_request", message: "Both entityKind and entityId are required." } });

    let result: Awaited<ReturnType<typeof fetchMemoryByScope>> | undefined;
    await expect(
      (async () => {
        result = await fetchMemoryByScope({ entityKind: "", entityId: "" }, buildConfig(fetchImpl));
      })(),
    ).resolves.not.toThrow();

    expect(result?.state).toBe("unavailable");
    if (result?.state === "unavailable") {
      expect(result.reason).toContain("invalid_request");
    }
  });
});

describe("glassmindReadClient — readiness healthy/unhealthy maps correctly", () => {
  it("maps a healthy readiness response to state: ready", async () => {
    const { fetchImpl } = buildFakeFetch({ ready: true });

    const result = await fetchGlassmindReadiness(buildConfig(fetchImpl));

    expect(result).toEqual({ state: "ready" });
  });

  it("maps an unhealthy readiness response to state: unavailable, with a reason", async () => {
    const { fetchImpl } = buildFakeFetch({ ready: false, reason: "Backend not configured." });

    const result = await fetchGlassmindReadiness(buildConfig(fetchImpl));

    expect(result).toEqual({ state: "unavailable", reason: "Backend not configured." });
  });
});

const WRITE_SHAPED_PREFIXES = ["write", "insert", "create", "delete", "remove", "ingest", "update", "resolve"];

describe("glassmindReadClient.ts — no write, ingest, update, resolve, delete, create, or insert methods exist", () => {
  it("exports exactly the four expected fetch functions", async () => {
    const module = await import("./glassmindReadClient.js");
    const exportedFunctionNames = Object.keys(module).filter((key) => typeof (module as Record<string, unknown>)[key] === "function");

    expect(exportedFunctionNames.sort()).toEqual([
      "fetchGlassmindReadiness",
      "fetchMemoryByScope",
      "fetchMemoryBySourceReference",
      "fetchMemoryTrace",
    ]);
  });

  it("has no exported function whose name matches any write-shaped prefix", async () => {
    const module = await import("./glassmindReadClient.js");
    const exportedFunctionNames = Object.keys(module).filter((key) => typeof (module as Record<string, unknown>)[key] === "function");

    for (const name of exportedFunctionNames) {
      const lower = name.toLowerCase();
      expect(WRITE_SHAPED_PREFIXES.some((prefix) => lower.startsWith(prefix) || lower.includes(prefix))).toBe(false);
    }
  });
});

describe("glassmindReadClient.ts — no import from apps/glassmind", () => {
  it("has no import statement referencing apps/glassmind or @commandcore/glassmind", () => {
    const sourcePath = join(process.cwd(), "src", "glassmindReadClient.ts");
    const source = readFileSync(sourcePath, "utf-8");
    const importLines = source.split("\n").filter((line: string) => /^\s*import\b/.test(line));

    for (const line of importLines) {
      expect(line.toLowerCase()).not.toContain("glassmind");
    }
  });
});
