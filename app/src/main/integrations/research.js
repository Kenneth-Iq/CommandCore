/**
 * Phase 4 — Research feeds integration.
 * Sources: ArXiv (AI/ML), Reddit (configurable subreddits), RSS (custom).
 * Feed config: C:\jarvis\config\feeds.yaml
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import yaml from 'js-yaml'
import { registerTool } from '../tools.js'
import { sandboxWrite } from '../sandbox.js'

// ── Feed config ───────────────────────────────────────────────────────────

function loadFeedsConfig(sandboxRoot) {
  const p = join(sandboxRoot, 'config', 'feeds.yaml')
  if (!existsSync(p)) return { feeds: [] }
  return yaml.load(readFileSync(p, 'utf8')) ?? { feeds: [] }
}

// ── ArXiv ─────────────────────────────────────────────────────────────────

async function fetchArxiv({ categories = ['cs.AI', 'cs.LG', 'cs.CL'], maxResults = 10 }) {
  const catStr = categories.join('+OR+')
  const url = `https://export.arxiv.org/api/query?search_query=cat:${catStr}&sortBy=submittedDate&sortOrder=descending&max_results=${maxResults}`
  const res  = await fetch(url)
  const text = await res.text()

  // Parse Atom XML manually (no xml2js dependency)
  const entries = []
  const entryMatches = text.matchAll(/<entry>([\s\S]*?)<\/entry>/g)
  for (const m of entryMatches) {
    const e = m[1]
    const title   = (e.match(/<title>([\s\S]*?)<\/title>/)   ?.[1] ?? '').replace(/\s+/g, ' ').trim()
    const summary = (e.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] ?? '').replace(/\s+/g, ' ').trim().slice(0, 400)
    const id      = (e.match(/<id>(.*?)<\/id>/)              ?.[1] ?? '').trim()
    const authors = [...e.matchAll(/<name>(.*?)<\/name>/g)].map(a => a[1]).slice(0, 3).join(', ')
    entries.push({ title, summary, id, authors })
  }
  return entries
}

// ── Reddit ────────────────────────────────────────────────────────────────

async function fetchReddit({ subreddit, limit = 10 }, config) {
  const feedsCfg = loadFeedsConfig(config.sandbox.root)
  const redditKey = loadCredential('reddit_client_id')

  // Use JSON API (no auth needed for public subreddits)
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`
  const res  = await fetch(url, { headers: { 'User-Agent': 'JarvisAgent/1.0' } })
  if (!res.ok) throw new Error(`Reddit API error: ${res.status}`)
  const data = await res.json()

  return (data.data?.children ?? []).map(c => ({
    title:   c.data.title,
    url:     `https://reddit.com${c.data.permalink}`,
    score:   c.data.score,
    comments: c.data.num_comments,
    selftext: c.data.selftext?.slice(0, 300)
  }))
}

// ── RSS ───────────────────────────────────────────────────────────────────

async function fetchRss({ feedUrl, limit = 10 }) {
  const res  = await fetch(feedUrl)
  const text = await res.text()

  const items = []
  const itemMatches = text.matchAll(/<item>([\s\S]*?)<\/item>/g)
  for (const m of itemMatches) {
    if (items.length >= limit) break
    const e = m[1]
    const title = (e.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ?? e.match(/<title>([\s\S]*?)<\/title>/))?.[1]?.trim() ?? ''
    const link  = (e.match(/<link>(.*?)<\/link>/))?.[1]?.trim() ?? ''
    const desc  = (e.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ?? e.match(/<description>([\s\S]*?)<\/description>/))?.[1]?.replace(/<[^>]+>/g, '').trim().slice(0, 300) ?? ''
    items.push({ title, link, description: desc })
  }
  return items
}

// ── Save article ──────────────────────────────────────────────────────────

async function saveArticle({ title, url, content }) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)
  const filename = `research/${Date.now()}-${slug}.md`
  const body = `# ${title}\n\nSource: ${url}\nSaved: ${new Date().toISOString()}\n\n${content}`
  sandboxWrite(filename, body)
  return { saved: true, path: filename }
}

// ── Morning briefing helper (called by briefing.js) ───────────────────────

export async function gatherBriefingData(config) {
  const results = { arxiv: [], reddit: [], rss: [] }
  try { results.arxiv  = await fetchArxiv({ maxResults: 5 }) } catch {}
  const feedsCfg = loadFeedsConfig(config.sandbox.root)
  for (const feed of feedsCfg.feeds ?? []) {
    try {
      if (feed.type === 'reddit')  results.reddit.push(...await fetchReddit({ subreddit: feed.subreddit, limit: 3 }, config))
      else if (feed.url)           results.rss.push(   ...await fetchRss({ feedUrl: feed.url, limit: 3 }))
    } catch {}
  }
  return results
}

// ── Registration ──────────────────────────────────────────────────────────

import { loadCredential } from '../credentials.js'

export function registerResearchTools() {
  registerTool('fetch_arxiv', {
    tier: 0,
    definition: {
      type: 'function',
      function: {
        name: 'fetch_arxiv',
        description: 'Fetch recent AI/ML papers from ArXiv.',
        parameters: {
          type: 'object',
          properties: {
            categories: { type: 'array', items: { type: 'string' }, description: 'ArXiv categories, e.g. cs.AI' },
            maxResults: { type: 'integer', default: 10 }
          }
        }
      }
    },
    handler: fetchArxiv
  })

  registerTool('fetch_reddit', {
    tier: 0,
    definition: {
      type: 'function',
      function: {
        name: 'fetch_reddit',
        description: 'Fetch hot posts from a subreddit.',
        parameters: {
          type: 'object', required: ['subreddit'],
          properties: {
            subreddit: { type: 'string' },
            limit:     { type: 'integer', default: 10 }
          }
        }
      }
    },
    handler: fetchReddit
  })

  registerTool('fetch_rss', {
    tier: 0,
    definition: {
      type: 'function',
      function: {
        name: 'fetch_rss',
        description: 'Fetch items from an RSS feed URL.',
        parameters: {
          type: 'object', required: ['feedUrl'],
          properties: {
            feedUrl: { type: 'string' },
            limit:   { type: 'integer', default: 10 }
          }
        }
      }
    },
    handler: fetchRss
  })

  registerTool('save_article', {
    tier: 1,
    describeAction: a => `Save article "${a.title}"`,
    definition: {
      type: 'function',
      function: {
        name: 'save_article',
        description: 'Save an article to the sandbox research folder.',
        parameters: {
          type: 'object', required: ['title', 'url', 'content'],
          properties: {
            title:   { type: 'string' },
            url:     { type: 'string' },
            content: { type: 'string' }
          }
        }
      }
    },
    handler: saveArticle
  })
}
