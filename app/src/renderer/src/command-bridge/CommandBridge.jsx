import { useEffect } from 'react'
import { useJarvisStore } from '../store/jarvisStore.js'
import { initJarvisFeed } from '../lib/jarvisEvents.js'
import SystemRibbon from './SystemRibbon.jsx'
import GlanceBar from './GlanceBar.jsx'
import MissionRail from './MissionRail.jsx'
import ApprovalDeck from './ApprovalDeck.jsx'
import SitrepStream from './SitrepStream.jsx'
import VoiceDock from './VoiceDock.jsx'
import ArtifactDrawer from './ArtifactDrawer.jsx'
import ArcReactor from './ArcReactor.jsx'
import { AgentCard, useRoleStates } from './AgentRoster.jsx'
import './command-bridge.css'

// Prime is the orb itself; the five role agents flank it.
const LEFT_ROLES = ['researcher', 'analyst', 'operator']
const RIGHT_ROLES = ['writer', 'sentinel']

function Stage() {
  const voiceState = useJarvisStore(s => s.voiceState)
  const roles = useRoleStates()
  return (
    <div className="cb-stage cb-panel">
      <div className="ag-col">
        {LEFT_ROLES.map(r => <AgentCard key={r} role={r} state={roles[r].state} activity={roles[r].activity} />)}
      </div>
      <ArcReactor voiceState={voiceState} />
      <div className="ag-col">
        {RIGHT_ROLES.map(r => <AgentCard key={r} role={r} state={roles[r].state} activity={roles[r].activity} />)}
      </div>
      <ApprovalDeck />
    </div>
  )
}

export default function CommandBridge() {
  const setVoiceState = useJarvisStore(s => s.setVoiceState)
  const setTranscript = useJarvisStore(s => s.setTranscript)
  const artifactOpen = useJarvisStore(s => s.artifactDrawer.open)

  useEffect(() => {
    const store = useJarvisStore.getState()
    const offFeed = initJarvisFeed(store)
    const offVoice = window.jarvis.onStateChange(({ state }) => setVoiceState(state))
    const offTx = window.jarvis.onTranscription(({ text }) => setTranscript(text))
    // Approvals ride the existing confirmation channel; the matching Core
    // approval.requested event enriches the card with tier/agent.
    const offConfirm = window.jarvis.onConfirmationRequest(d => {
      useJarvisStore.getState().pushApproval({
        id: d.id, action: d.action, description: d.description,
        requireDouble: d.requireDouble, tier: d.requireDouble ? 3 : 2,
      })
    })
    return () => { offFeed(); offVoice(); offTx(); offConfirm() }
  }, [setVoiceState, setTranscript])

  return (
    <div className="cb-root">
      <SystemRibbon />
      <GlanceBar />
      <div className="cb-middle">
        <MissionRail />
        <Stage />
      </div>
      <SitrepStream />
      <VoiceDock />
      {artifactOpen && <ArtifactDrawer />}
    </div>
  )
}
