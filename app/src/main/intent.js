import { prompt } from './llm.js'

const INTENT_SYSTEM = `You are an intent classifier for a voice assistant called Jarvis.
Classify the user's message into exactly one of these categories and respond with ONLY the category name:

QUERY       - asking for information (calendar, email, status, weather, facts)
ACTION      - requesting a write/send/create action on an integration (calendar, email, social)
FILE_OP     - creating, reading, editing, or deleting files
SYSTEM      - checking server status, running commands, health checks
RESEARCH    - searching feeds, summarizing articles, briefings
CLARIFICATION - message is ambiguous and cannot be classified without more info

Examples:
"What's on my calendar tomorrow?" -> QUERY
"Create a meeting at 3pm Friday" -> ACTION
"Create a file called notes.md" -> FILE_OP
"Is the production server up?" -> SYSTEM
"What's trending in AI today?" -> RESEARCH
"Send it" (no prior context) -> CLARIFICATION`

const INTENT_LABELS = ['QUERY', 'ACTION', 'FILE_OP', 'SYSTEM', 'RESEARCH', 'CLARIFICATION']

export async function classifyIntent(userMessage) {
  try {
    const raw = await prompt(INTENT_SYSTEM, userMessage, { maxTokens: 20, temperature: 0 })
    const label = raw.trim().toUpperCase()
    if (INTENT_LABELS.includes(label)) return label
    // Fallback: find any matching label in the response
    for (const l of INTENT_LABELS) {
      if (raw.includes(l)) return l
    }
    return 'CLARIFICATION'
  } catch {
    return 'CLARIFICATION'
  }
}

// Returns a system prompt tailored to the classified intent
export function getSystemPromptForIntent(intent) {
  const base = `You are Jarvis, a voice-first AI agent running on the user's local machine.
You have access to tools for file operations, calendar, email, and server monitoring.
Be concise — your responses are read aloud via text-to-speech.
Keep responses under 3 sentences unless the user explicitly asks for more detail.
Never reveal API keys, tokens, or file paths outside C:\\jarvis\\.`

  const extras = {
    FILE_OP: `\nWhen performing file operations, always confirm the action with the file path before executing.`,
    ACTION: `\nFor calendar or email actions, read back the key details before confirming execution.`,
    SYSTEM: `\nFor server operations, always state which server you are targeting.`,
    CLARIFICATION: `\nThe user's message is ambiguous. Ask ONE targeted clarifying question.`
  }

  return base + (extras[intent] ?? '')
}
