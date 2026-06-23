import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useJarvisStore } from '../store/jarvisStore.js'
import { X, FileText, Folder } from 'lucide-react'

const TEXT_EXT = /\.(md|txt|json|csv|log|yaml|yml|js|py|html|css|xml)$/i
const PREVIEW_CAP = 50_000

export default function ArtifactDrawer() {
  const { artifactDrawer, closeArtifacts } = useJarvisStore()
  const { open, missionId } = artifactDrawer
  const [entries, setEntries] = useState([])
  const [preview, setPreview] = useState(null)
  const dir = missionId ? `missions/${missionId}` : null

  useEffect(() => {
    if (!open || !dir) return
    setPreview(null)
    window.jarvis.fileList(dir).then(list => setEntries(list || [])).catch(() => setEntries([]))
  }, [open, dir])

  if (!open) return null

  async function openFile(entry) {
    if (entry.isDir) return
    if (!TEXT_EXT.test(entry.name)) { setPreview({ name: entry.name, text: '(binary file — preview unavailable)' }); return }
    try {
      const content = await window.jarvis.fileRead(`${dir}/${entry.name}`)
      setPreview({ name: entry.name, text: String(content).slice(0, PREVIEW_CAP) })
    } catch { setPreview({ name: entry.name, text: '(could not read file)' }) }
  }

  return (
    <motion.div className="cb-drawer" initial={{ x: 340 }} animate={{ x: 0 }} exit={{ x: 340 }}>
      <div className="cb-drawer-head">
        <span style={{ fontSize: 12, color: '#7c8794' }}>Artifacts · {missionId?.slice(0, 14)}…</span>
        <X size={16} style={{ cursor: 'pointer' }} onClick={closeArtifacts} />
      </div>
      <div className="cb-drawer-body">
        {preview ? (
          <>
            <div className="cb-file" onClick={() => setPreview(null)}>← back</div>
            <div style={{ fontSize: 12, color: '#d7dde5', margin: '4px 6px' }}>{preview.name}</div>
            <div className="cb-preview">{preview.text}</div>
          </>
        ) : (
          <>
            {entries.map(e => (
              <div key={e.name} className="cb-file" onClick={() => openFile(e)}>
                {e.isDir ? <Folder size={13} /> : <FileText size={13} />} {e.name}
              </div>
            ))}
            {entries.length === 0 && (
              <div className="cb-empty">No artifacts yet. Mission file writes land here.</div>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}
