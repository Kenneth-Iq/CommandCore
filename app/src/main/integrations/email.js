import { graph } from './graph.js'
import { registerTool } from '../tools.js'
import { sandboxWrite } from '../sandbox.js'

// ── Helpers ──────────────────────────────────────────────────────────────

function formatMessage(m) {
  return {
    id:         m.id,
    subject:    m.subject,
    from:       m.from?.emailAddress?.address,
    fromName:   m.from?.emailAddress?.name,
    receivedAt: m.receivedDateTime,
    isRead:     m.isRead,
    hasAttachments: m.hasAttachments,
    bodyPreview: m.bodyPreview?.slice(0, 400)
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────

async function getEmails({ folder = 'inbox', unreadOnly = false, limit = 20, search }) {
  let url = `/me/mailFolders/${folder}/messages?$top=${limit}&$orderby=receivedDateTime desc`
  if (unreadOnly)  url += `&$filter=isRead eq false`
  if (search)      url = `/me/messages?$search="${search}"&$top=${limit}`
  const data = await graph.get(url)
  return (data.value ?? []).map(formatMessage)
}

async function readEmail({ messageId }) {
  const m = await graph.get(`/me/messages/${messageId}?$select=id,subject,from,body,receivedDateTime,isRead,hasAttachments,toRecipients,ccRecipients`)
  return {
    id:         m.id,
    subject:    m.subject,
    from:       m.from?.emailAddress?.address,
    fromName:   m.from?.emailAddress?.name,
    to:         (m.toRecipients ?? []).map(r => r.emailAddress?.address),
    cc:         (m.ccRecipients ?? []).map(r => r.emailAddress?.address),
    receivedAt: m.receivedDateTime,
    body:       m.body?.content?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000)
  }
}

async function draftEmail({ to, subject, body, cc }) {
  const draft = {
    subject,
    body: { contentType: 'text', content: body },
    toRecipients:  (Array.isArray(to) ? to : [to]).map(a => ({ emailAddress: { address: a } }))
  }
  if (cc?.length) {
    draft.ccRecipients = (Array.isArray(cc) ? cc : [cc]).map(a => ({ emailAddress: { address: a } }))
  }
  // Save to Drafts folder + write to sandbox
  const result = await graph.post('/me/messages', draft)
  sandboxWrite(`drafts/email_${Date.now()}.txt`,
    `To: ${to}\nSubject: ${subject}\n\n${body}`)
  return { drafted: true, id: result.id, subject: result.subject }
}

async function sendEmail({ to, subject, body, cc }) {
  // Guard: flag if body looks like it contains sensitive data
  const sensitivePattern = /\b(?:\d{4}[- ]?){3}\d{4}\b|\b\d{3}-\d{2}-\d{4}\b/
  if (sensitivePattern.test(body)) {
    return { error: 'Message body appears to contain a credit card number or SSN. Please review before sending.' }
  }

  const msg = {
    message: {
      subject,
      body: { contentType: 'text', content: body },
      toRecipients: (Array.isArray(to) ? to : [to]).map(a => ({ emailAddress: { address: a } }))
    },
    saveToSentItems: true
  }
  if (cc?.length) {
    msg.message.ccRecipients = (Array.isArray(cc) ? cc : [cc]).map(a => ({ emailAddress: { address: a } }))
  }
  await graph.post('/me/sendMail', msg)
  return { sent: true, to, subject }
}

async function replyToEmail({ messageId, body, replyAll = false }) {
  const endpoint = replyAll
    ? `/me/messages/${messageId}/replyAll`
    : `/me/messages/${messageId}/reply`
  await graph.post(endpoint, { message: { body: { contentType: 'text', content: body } } })
  return { replied: true, messageId, replyAll }
}

async function archiveEmail({ messageId }) {
  await graph.post(`/me/messages/${messageId}/move`, { destinationId: 'archive' })
  return { archived: true, messageId }
}

// ── Registration ──────────────────────────────────────────────────────────

export function registerEmailTools() {
  registerTool('get_emails', {
    tier: 0,
    definition: {
      type: 'function',
      function: {
        name: 'get_emails',
        description: 'Fetch emails from a mail folder.',
        parameters: {
          type: 'object',
          properties: {
            folder:     { type: 'string', enum: ['inbox','sentItems','drafts'], description: 'Mail folder.' },
            unreadOnly: { type: 'boolean' },
            limit:      { type: 'integer', default: 20 },
            search:     { type: 'string', description: 'Search query.' }
          }
        }
      }
    },
    handler: getEmails
  })

  registerTool('read_email', {
    tier: 0,
    definition: {
      type: 'function',
      function: {
        name: 'read_email',
        description: 'Read the full content of a specific email.',
        parameters: {
          type: 'object',
          required: ['messageId'],
          properties: { messageId: { type: 'string' } }
        }
      }
    },
    handler: readEmail
  })

  registerTool('draft_email', {
    tier: 1,
    describeAction: a => `Draft email to ${a.to}: "${a.subject}"`,
    definition: {
      type: 'function',
      function: {
        name: 'draft_email',
        description: 'Create an email draft (does NOT send it).',
        parameters: {
          type: 'object',
          required: ['to', 'subject', 'body'],
          properties: {
            to:      { type: 'string', description: 'Recipient email.' },
            subject: { type: 'string' },
            body:    { type: 'string' },
            cc:      { type: 'string' }
          }
        }
      }
    },
    handler: draftEmail
  })

  registerTool('send_email', {
    tier: 2,
    describeAction: a => `Send email to ${a.to}: "${a.subject}"`,
    definition: {
      type: 'function',
      function: {
        name: 'send_email',
        description: 'Compose and send an email immediately.',
        parameters: {
          type: 'object',
          required: ['to', 'subject', 'body'],
          properties: {
            to:      { type: 'string' },
            subject: { type: 'string' },
            body:    { type: 'string' },
            cc:      { type: 'string' }
          }
        }
      }
    },
    handler: sendEmail
  })

  registerTool('reply_to_email', {
    tier: 2,
    describeAction: a => `Reply to email ${a.messageId}${a.replyAll ? ' (reply-all)' : ''}`,
    definition: {
      type: 'function',
      function: {
        name: 'reply_to_email',
        description: 'Reply to an existing email.',
        parameters: {
          type: 'object',
          required: ['messageId', 'body'],
          properties: {
            messageId: { type: 'string' },
            body:      { type: 'string' },
            replyAll:  { type: 'boolean', default: false }
          }
        }
      }
    },
    handler: replyToEmail
  })

  registerTool('archive_email', {
    tier: 1,
    describeAction: a => `Archive email ${a.messageId}`,
    definition: {
      type: 'function',
      function: {
        name: 'archive_email',
        description: 'Move an email to the archive folder.',
        parameters: {
          type: 'object',
          required: ['messageId'],
          properties: { messageId: { type: 'string' } }
        }
      }
    },
    handler: archiveEmail
  })
}
