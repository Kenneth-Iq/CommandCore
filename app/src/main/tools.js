/**
 * Tool registry and agentic execution loop.
 *
 * Tools are registered per-integration. The agentic loop runs inside
 * handleMessage: the LLM can call tools, results feed back in, and the
 * loop continues until the model returns a final text response.
 *
 * Tiers mirror the PRD permission model:
 *   0 = read-only (no confirmation, no log)
 *   1 = draft     (auto-log, no confirmation)
 *   2 = send/post (confirmation required)
 *   3 = destructive (double-confirmation required)
 */

import { logAction } from './log.js'

const registry = new Map() // name -> { definition, handler, tier, describeAction }

// ── Registration ────────────────────────────────────────────────────────────

export function registerTool(name, { definition, handler, tier = 0, describeAction = null }) {
  registry.set(name, { definition, handler, tier, describeAction })
}

export function getToolDefinitions() {
  return Array.from(registry.values()).map(t => t.definition)
}

export function hasTool(name) {
  return registry.has(name)
}

// ── Execution ────────────────────────────────────────────────────────────────

/**
 * Execute a single tool call from the LLM.
 * @param {string} name
 * @param {object} args     - parsed JSON arguments from the LLM
 * @param {object} ctx      - { confirm, config }
 * @returns {object}        - result to feed back to the LLM
 */
export async function executeTool(name, args, ctx) {
  const tool = registry.get(name)
  if (!tool) {
    return { error: `Unknown tool: ${name}` }
  }

  try {
    // Tier 2+ requires confirmation; tier 3 requires double-confirmation
    if (tool.tier >= 2) {
      const description = tool.describeAction
        ? tool.describeAction(args)
        : `${name}: ${JSON.stringify(args)}`

      const confirmed = await ctx.confirm({
        action: name,
        description,
        requireDouble: tool.tier >= 3
      })

      if (!confirmed) {
        return { cancelled: true, message: 'Action cancelled by user.' }
      }
    }

    const result = await tool.handler(args, ctx.config)

    // Log all tier-1+ actions
    if (tool.tier >= 1) {
      logAction({
        intent: name,
        actionType: name,
        target: args.recipient ?? args.eventId ?? args.path ?? null,
        payloadSummary: JSON.stringify(args).slice(0, 200),
        confirmedBy: tool.tier >= 2 ? 'user' : 'auto',
        result: JSON.stringify(result).slice(0, 200)
      })
    }

    return result
  } catch (err) {
    return { error: err.message }
  }
}

// ── Agentic loop ─────────────────────────────────────────────────────────────

/**
 * Run one full agentic turn: call the LLM, handle any tool calls, and
 * return the final text response. Caps at MAX_ITERATIONS to prevent loops.
 *
 * @param {object[]} messages   - full conversation including system prompt
 * @param {object}   opts       - { config, confirm, onToken, client, model }
 * @returns {string}            - final assistant text
 */
const MAX_ITERATIONS = 6

export async function agenticLoop(messages, opts) {
  const { config, confirm, onToken, client, model } = opts
  const tools = getToolDefinitions()

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const response = await client.chat.completions.create({
      model,
      messages,
      max_tokens: config.llm.max_tokens ?? 2048,
      temperature: config.llm.temperature ?? 0.7,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined
    })

    const choice = response.choices[0]
    const msg = choice.message
    messages.push(msg)

    if (choice.finish_reason === 'stop' || choice.finish_reason === 'length') {
      return msg.content ?? ''
    }

    if (choice.finish_reason === 'tool_calls' && msg.tool_calls?.length) {
      for (const call of msg.tool_calls) {
        let args
        try {
          args = JSON.parse(call.function.arguments)
        } catch {
          args = {}
        }

        const result = await executeTool(call.function.name, args, { confirm, config })

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result)
        })
      }
      // Continue loop — LLM will now formulate a response using tool results
      continue
    }

    // Unexpected finish reason — return whatever content we have
    return msg.content ?? ''
  }

  return 'I hit the iteration limit while processing your request. Please try a simpler query.'
}
