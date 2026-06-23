import { AnimatePresence, motion } from 'framer-motion'
import { useJarvisStore } from '../store/jarvisStore.js'

// Floats over the stage corner — only present when something needs a decision.
export default function ApprovalDeck() {
  const { approvals, missions, resolveApproval } = useJarvisStore()

  function respond(card, confirmed) {
    // double-confirm tier-3+: first click arms, second sends
    if (card.requireDouble && !card._armed) {
      useJarvisStore.setState(s => ({
        approvals: s.approvals.map(a => a.id === card.id ? { ...a, _armed: true } : a),
      }))
      return
    }
    try { window.jarvis.confirmationResponse(card.id, confirmed) } catch { /* noop */ }
    resolveApproval(card.id)
  }

  if (approvals.length === 0) return null

  return (
    <div className="cb-approval-deck">
      <div className="cb-col-head" style={{ padding: '0 0 6px' }}>Approval Deck</div>
      <AnimatePresence>
        {approvals.map(card => {
          const tier = card.tier ?? 2
          const title = missions[card.mission_id]?.title
          return (
            <motion.div key={card.id} className={`cb-approval ${tier >= 3 ? 't3' : ''}`}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }} layout>
              <span className="cb-tier" style={{ color: tier >= 3 ? '#ff5252' : '#ffd54f' }}>
                T{tier} · {card.action || 'action'}
              </span>
              <div className="cb-desc">{card.description || '(no detail)'}</div>
              {title && <div style={{ fontSize: 10, color: '#7c8794' }}>{title}{card.agent_id ? ` · ${card.agent_id}` : ''}</div>}
              <div className="cb-actions" style={{ marginTop: 6 }}>
                <button className="cb-approve" onClick={() => respond(card, true)}>
                  {card._armed ? 'Confirm ✓' : 'Approve'}
                </button>
                <button className="cb-deny" onClick={() => respond(card, false)}>Deny</button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
