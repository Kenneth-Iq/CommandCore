import { DeterministicJarvisConversationEngine } from "./engine.js";
import { GlassmindReadOnlyMemoryAdapter } from "./glassmindReadAdapter.js";
import type {
  GlassmindLikeMemoryRecord,
  GlassmindLikeScope,
  GlassmindLikeSourceReference,
  GlassmindLikeStore,
} from "./glassmindReadAdapter.js";
import type { JarvisConversationEngine } from "./types.js";

/**
 * Controlled backend/dev harness for the Jarvis <-> Glassmind read-only
 * integration, per docs/roadmap/Sprint-12-Implementation-Plan.md §3 item 8.
 *
 * This module exists to exercise GlassmindReadOnlyMemoryAdapter end-to-end
 * through a real JarvisConversationEngine, without Nexus and without any
 * real persistence — DevFakeGlassmindStore below is an in-process fixture,
 * not a connection to apps/glassmind's durable store or any database. It is
 * dev/test tooling only, not production wiring: nothing here subscribes to
 * a real event feed, opens a network connection, or is imported by any
 * frontend.
 *
 * Deliberately does not import apps/nexus-console — this harness has no
 * relationship to the frontend at all, consistent with
 * docs/architecture/Nexus-Glassmind-Read-Only-Evidence-Plan.md's read-only,
 * backend-mediated boundary (Nexus does not reach Glassmind-backed data
 * through apps/jarvis-engine either).
 */

/**
 * In-process fake satisfying GlassmindLikeStore, returning a fixed set of
 * records regardless of the query — sufficient for demonstrating the three
 * honest memory-retrieval outcomes without needing a real Glassmind store.
 * Read-only: only the two GlassmindLikeStore methods exist on this class,
 * no insert/update/write method of any kind.
 */
export class DevFakeGlassmindStore implements GlassmindLikeStore {
  constructor(private readonly records: GlassmindLikeMemoryRecord[] = []) {}

  retrieveBySourceReference(_sourceReference: GlassmindLikeSourceReference): GlassmindLikeMemoryRecord[] {
    return this.records;
  }

  retrieveByScope(_scope: GlassmindLikeScope): GlassmindLikeMemoryRecord[] {
    return this.records;
  }
}

/** Engine with no memory store configured at all — demonstrates "not_queried". */
export function buildHarnessWithoutMemoryStore(): JarvisConversationEngine {
  return new DeterministicJarvisConversationEngine();
}

/** Engine wired to a Glassmind-like store with no records — demonstrates "no_memory_found". */
export function buildHarnessWithEmptyMemory(): JarvisConversationEngine {
  return new DeterministicJarvisConversationEngine(new GlassmindReadOnlyMemoryAdapter(new DevFakeGlassmindStore([])));
}

/**
 * Engine wired to a Glassmind-like store with the given records —
 * demonstrates "found", with or without evidence depending on what the
 * caller supplies. The engine itself (not this harness) is responsible for
 * never fabricating evidence for a record that didn't carry any.
 */
export function buildHarnessWithMemory(records: GlassmindLikeMemoryRecord[]): JarvisConversationEngine {
  return new DeterministicJarvisConversationEngine(new GlassmindReadOnlyMemoryAdapter(new DevFakeGlassmindStore(records)));
}
