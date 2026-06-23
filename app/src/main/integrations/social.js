/**
 * Phase 5 — Social media integration.
 * Twitter/X via API v2, LinkedIn via REST API.
 * All public post/DM actions require double-confirmation (tier 3).
 */

import { registerTool } from '../tools.js'
import { loadCredential } from '../credentials.js'
import { sandboxWrite } from '../sandbox.js'

// ── Twitter / X ────────────────────────────────────────────────────────────

function twitterAuthHeaders() {
  const bearer = loadCredential('twitter_bearer_token')
  if (!bearer) throw new Error('Twitter bearer token not set. Add it in the Integrations tab.')
  return { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' }
}

async function twitterGet(path) {
  const res = await fetch(`https://api.twitter.com/2${path}`, { headers: twitterAuthHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.detail ?? `Twitter API ${res.status}`)
  return data
}

async function twitterPost(path, body) {
  const res = await fetch(`https://api.twitter.com/2${path}`, {
    method: 'POST', headers: twitterAuthHeaders(), body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.detail ?? `Twitter API ${res.status}`)
  return data
}

async function getTwitterFeed({ limit = 10 }) {
  // Get authenticated user's timeline
  const me = await twitterGet('/users/me')
  const userId = me.data.id
  const data = await twitterGet(`/users/${userId}/timelines/reverse_chronological?max_results=${Math.min(limit, 100)}&tweet.fields=public_metrics`)
  return (data.data ?? []).map(t => ({ id: t.id, text: t.text, likes: t.public_metrics?.like_count }))
}

async function searchTwitter({ query, limit = 10 }) {
  const data = await twitterGet(`/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${Math.min(limit, 100)}`)
  return (data.data ?? []).map(t => ({ id: t.id, text: t.text }))
}

async function draftTweet({ text }) {
  const LIMIT = 280
  if (text.length > LIMIT) {
    return { error: `Tweet is ${text.length} characters — exceeds the ${LIMIT} character limit. Shorten it.` }
  }
  const filename = `drafts/tweet_${Date.now()}.txt`
  sandboxWrite(filename, text)
  return { drafted: true, path: filename, text, charCount: text.length }
}

async function postTweet({ text }) {
  const LIMIT = 280
  if (text.length > LIMIT) {
    return { error: `Tweet is ${text.length} chars — exceeds ${LIMIT} limit.` }
  }
  const data = await twitterPost('/tweets', { text })
  return { posted: true, id: data.data?.id, text }
}

// ── LinkedIn ───────────────────────────────────────────────────────────────

function linkedinHeaders() {
  const token = loadCredential('linkedin_access_token')
  if (!token) throw new Error('LinkedIn access token not set. Add it in the Integrations tab.')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0'
  }
}

async function getLinkedinProfile() {
  const res = await fetch('https://api.linkedin.com/v2/me', { headers: linkedinHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message ?? `LinkedIn API ${res.status}`)
  return { id: data.id, name: `${data.localizedFirstName} ${data.localizedLastName}` }
}

async function draftLinkedinPost({ text }) {
  const filename = `drafts/linkedin_${Date.now()}.txt`
  sandboxWrite(filename, text)
  return { drafted: true, path: filename, text, charCount: text.length }
}

async function postLinkedin({ text }) {
  const profile = await getLinkedinProfile()
  const body = {
    author: `urn:li:person:${profile.id}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: 'NONE'
      }
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
  }
  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST', headers: linkedinHeaders(), body: JSON.stringify(body)
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.message ?? `LinkedIn API ${res.status}`)
  }
  return { posted: true, text }
}

// ── Registration ──────────────────────────────────────────────────────────

export function registerSocialTools() {
  registerTool('get_twitter_feed', {
    tier: 0,
    definition: {
      type: 'function',
      function: {
        name: 'get_twitter_feed',
        description: "Fetch the authenticated user's Twitter/X home timeline.",
        parameters: { type: 'object', properties: { limit: { type: 'integer', default: 10 } } }
      }
    },
    handler: getTwitterFeed
  })

  registerTool('search_twitter', {
    tier: 0,
    definition: {
      type: 'function',
      function: {
        name: 'search_twitter',
        description: 'Search recent tweets by keyword or hashtag.',
        parameters: {
          type: 'object', required: ['query'],
          properties: { query: { type: 'string' }, limit: { type: 'integer', default: 10 } }
        }
      }
    },
    handler: searchTwitter
  })

  registerTool('draft_tweet', {
    tier: 1,
    describeAction: a => `Draft tweet: "${a.text.slice(0, 60)}..."`,
    definition: {
      type: 'function',
      function: {
        name: 'draft_tweet',
        description: 'Save a tweet draft to the sandbox (does NOT post).',
        parameters: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } }
      }
    },
    handler: draftTweet
  })

  registerTool('post_tweet', {
    tier: 3,
    describeAction: a => `Post publicly to Twitter/X: "${a.text.slice(0, 60)}..."`,
    definition: {
      type: 'function',
      function: {
        name: 'post_tweet',
        description: 'Post a tweet publicly to Twitter/X. Requires double confirmation.',
        parameters: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } }
      }
    },
    handler: postTweet
  })

  registerTool('draft_linkedin_post', {
    tier: 1,
    describeAction: a => `Draft LinkedIn post: "${a.text.slice(0, 60)}..."`,
    definition: {
      type: 'function',
      function: {
        name: 'draft_linkedin_post',
        description: 'Save a LinkedIn post draft to the sandbox (does NOT post).',
        parameters: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } }
      }
    },
    handler: draftLinkedinPost
  })

  registerTool('post_linkedin', {
    tier: 3,
    describeAction: a => `Post publicly to LinkedIn: "${a.text.slice(0, 60)}..."`,
    definition: {
      type: 'function',
      function: {
        name: 'post_linkedin',
        description: 'Publish a post to LinkedIn publicly. Requires double confirmation.',
        parameters: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } }
      }
    },
    handler: postLinkedin
  })
}
