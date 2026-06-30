import { classifyIntent, type JarvisIntent } from "./intentClassifier.js";
import type {
  JarvisConversationEngine,
  JarvisConversationEvidence,
  JarvisConversationInput,
  JarvisConversationResponse,
  JarvisMemoryStore,
  MemoryRetrievalStatus,
} from "./types.js";

const TOPIC_LABEL: Record<string, string> = {
  mission: "missions",
  agent: "agents",
  tool: "tools",
  knowledge: "knowledge assets",
  conversation: "conversations",
  attention: "what needs attention",
  action: "the requested action",
  unknown: "that",
};

function retrieveMemory(
  memoryStore: JarvisMemoryStore | undefined,
  input: JarvisConversationInput,
): { status: MemoryRetrievalStatus; evidence: JarvisConversationEvidence[] } {
  if (!memoryStore) {
    return { status: { status: "not_queried" }, evidence: [] };
  }

  const records = memoryStore.retrieve({ scope: input.context.scope });

  if (records.length === 0) {
    return { status: { status: "no_memory_found" }, evidence: [] };
  }

  // Evidence is collected only from records that actually carry it — the
  // engine never invents an evidence item for a memory record that didn't
  // supply one, even though the record itself counts toward recordCount.
  const evidence = records
    .map((record) => record.evidence)
    .filter((item): item is JarvisConversationEvidence => item !== undefined);

  return { status: { status: "found", recordCount: records.length }, evidence };
}

function buildAnswerText(intent: JarvisIntent, memory: { status: MemoryRetrievalStatus; evidence: JarvisConversationEvidence[] }): string {
  const topic = TOPIC_LABEL[intent.kind];

  if (intent.kind === "unknown") {
    return "Conversational intelligence is simulated in this build — no AI calls are made. Try asking about missions, agents, tools, knowledge, or conversations.";
  }

  const memoryClause =
    memory.status.status === "found"
      ? ` I found ${memory.status.recordCount} relevant memory record(s).`
      : memory.status.status === "no_memory_found"
        ? " I don't have any memory of this — this is the first time it's come up, as far as I can tell."
        : "";

  return `Here is what I can tell you about ${topic}.${memoryClause}`;
}

/**
 * Deterministic, no-AI, dev/test engine implementation. Mirrors the shape of
 * apps/nexus-console/src/conversationOrchestrator.ts's processConversationTurn
 * pipeline (classify -> retrieve evidence -> compose response -> surface
 * follow-up/decision/approval markers) but is the durable-pipeline contract's
 * own implementation, not a copy of the frontend's — the frontend simulation
 * is not imported by, and does not import, this package.
 *
 * Never calls a real LLM. Never writes to CommandCore, Glassmind, or any
 * external system — the only side effect of processTurn is an optional read
 * through the injected JarvisMemoryStore, which has no write method at all.
 */
export class DeterministicJarvisConversationEngine implements JarvisConversationEngine {
  constructor(private readonly memoryStore?: JarvisMemoryStore) {}

  processTurn(input: JarvisConversationInput): JarvisConversationResponse {
    const intent = classifyIntent(input.message);
    const memory = retrieveMemory(this.memoryStore, input);

    const response: JarvisConversationResponse = {
      answerText: buildAnswerText(intent, memory),
      evidence: memory.evidence,
      memoryRetrieval: memory.status,
    };

    if (intent.kind === "attention") {
      response.followUpSuggestion = {
        kind: "question",
        text: "Would you like a full briefing of everything that needs attention right now?",
      };
    }

    if (intent.impliesDeferral) {
      response.deferredDecision = {
        title: `Deferred: ${input.message}`,
        detail: "Marked for later review based on this conversation turn.",
        status: "deferred",
      };
    }

    if (intent.impliesAction) {
      response.approvalNeeded = {
        required: true,
        reason: "This message implies an action that would require an approved command before anything could actually happen.",
      };
    }

    return response;
  }
}
