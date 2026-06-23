/**
 * Morning briefing — aggregates calendar, email summary, and research.
 * Triggered by voice command "morning briefing" or on a schedule.
 */

import { gatherBriefingData } from './integrations/research.js'
import { chat } from './llm.js'
import { hasCredential } from './credentials.js'
import { loadCredential } from './credentials.js'

const BRIEFING_SYSTEM = `You are Jarvis delivering a concise morning briefing.
Summarise the provided data into a spoken briefing — no markdown, no bullet points.
Aim for under 2 minutes when read aloud (~300 words).
Lead with calendar events, then email highlights, then research.`

export async function generateBriefing(config, calendarEvents, emails) {
  const research = await gatherBriefingData(config)

  const dataBlock = JSON.stringify({
    calendar:  calendarEvents ?? [],
    emails:    emails ?? [],
    arxiv:     research.arxiv.slice(0, 3),
    reddit:    research.reddit.slice(0, 3),
    rss:       research.rss.slice(0, 3)
  }, null, 2)

  const messages = [
    { role: 'system', content: BRIEFING_SYSTEM },
    { role: 'user',   content: `Today is ${new Date().toDateString()}. Here is the data:\n${dataBlock}` }
  ]

  return chat(messages, { maxTokens: 512, temperature: 0.5 })
}
