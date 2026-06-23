/**
 * Phase 6 — Undo system.
 * Maintains a stack of reversible operations.
 * Each undo entry has: { id, description, revert: async fn }
 */

const MAX_UNDO = 20
const undoStack = []

export function pushUndo(description, revertFn) {
  const id = Date.now()
  undoStack.push({ id, description, revert: revertFn, pushedAt: new Date().toISOString() })
  if (undoStack.length > MAX_UNDO) undoStack.shift()
  return id
}

export async function undoLast() {
  const entry = undoStack.pop()
  if (!entry) return { message: 'Nothing to undo.' }
  try {
    await entry.revert()
    return { undone: true, description: entry.description }
  } catch (err) {
    return { error: `Undo failed: ${err.message}`, description: entry.description }
  }
}

export function listUndoable() {
  return undoStack.slice().reverse().map(e => ({
    id: e.id,
    description: e.description,
    pushedAt: e.pushedAt
  }))
}
