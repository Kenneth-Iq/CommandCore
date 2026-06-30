/**
 * Deterministic, keyword-based intent classification. No AI, no LLM call —
 * mirrors the same approach apps/nexus-console/src/conversationOrchestrator.ts
 * already rehearses in the frontend simulation, reimplemented independently
 * here (no import from apps/nexus-console) so this package stays standalone.
 */
export type JarvisIntentKind =
  | "mission"
  | "agent"
  | "tool"
  | "knowledge"
  | "conversation"
  | "attention"
  | "action"
  | "unknown";

export type JarvisIntent = {
  kind: JarvisIntentKind;
  impliesAction: boolean;
  impliesDeferral: boolean;
};

const TOPIC_KEYWORDS: Record<Exclude<JarvisIntentKind, "unknown" | "action">, string[]> = {
  mission: ["mission", "missions"],
  agent: ["agent", "agents"],
  tool: ["tool", "tools"],
  knowledge: ["knowledge", "asset", "assets"],
  conversation: ["conversation", "conversations", "thread"],
  attention: ["attention", "today", "urgent", "important"],
};

const ACTION_KEYWORDS = ["reassign", "restart", "approve", "cancel", "escalate", "decommission", "retry", "rerun", "deploy"];
const DEFERRAL_KEYWORDS = ["defer", "later", "postpone", "hold off", "not now"];

export function classifyIntent(message: string): JarvisIntent {
  const normalized = message.toLowerCase();
  const impliesAction = ACTION_KEYWORDS.some((keyword) => normalized.includes(keyword));
  const impliesDeferral = DEFERRAL_KEYWORDS.some((keyword) => normalized.includes(keyword));

  if (impliesAction) {
    return { kind: "action", impliesAction, impliesDeferral };
  }

  for (const kind of Object.keys(TOPIC_KEYWORDS) as Array<Exclude<JarvisIntentKind, "unknown" | "action">>) {
    if (TOPIC_KEYWORDS[kind].some((keyword) => normalized.includes(keyword))) {
      return { kind, impliesAction, impliesDeferral };
    }
  }

  return { kind: "unknown", impliesAction, impliesDeferral };
}
