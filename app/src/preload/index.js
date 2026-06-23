import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('jarvis', {
  // Messages
  sendMessage:     (text)               => ipcRenderer.invoke('jarvis:send-message', text),
  transcribeAudio: (b64)                => ipcRenderer.invoke('jarvis:transcribe-audio', b64),

  // File ops
  fileList:   (dir)              => ipcRenderer.invoke('jarvis:file-list', dir),
  fileRead:   (p)                => ipcRenderer.invoke('jarvis:file-read', p),
  fileWrite:  (p, content, opts) => ipcRenderer.invoke('jarvis:file-write', p, content, opts),
  fileDelete: (p)                => ipcRenderer.invoke('jarvis:file-delete', p),
  fileMove:   (f, t)             => ipcRenderer.invoke('jarvis:file-move', f, t),

  // Audit log
  logGet:    (limit) => ipcRenderer.invoke('jarvis:log-get', limit),
  logSearch: (q)     => ipcRenderer.invoke('jarvis:log-search', q),

  // Ambient glance feeds (weather / USD-ZAR / SYG4IR)
  feedsGlance:  ()              => ipcRenderer.invoke('jarvis:feeds-glance'),
  feedsHistory: (metric, range) => ipcRenderer.invoke('jarvis:feeds-history', metric, range),

  // Config
  getConfig:              ()             => ipcRenderer.invoke('jarvis:get-config'),
  listModels:             ()             => ipcRenderer.invoke('jarvis:list-models'),
  setModel:               (id)           => ipcRenderer.invoke('jarvis:set-model', id),
  setIntegrationEnabled:  (name, on)     => ipcRenderer.invoke('jarvis:set-integration-enabled', name, on),

  // Credentials
  saveCredential: (name, val) => ipcRenderer.invoke('jarvis:save-credential', name, val),
  hasCredential:  (name)      => ipcRenderer.invoke('jarvis:has-credential', name),
  canEncrypt:     ()          => ipcRenderer.invoke('jarvis:can-encrypt'),

  // Microsoft auth
  msAuthStart:  () => ipcRenderer.invoke('jarvis:ms-auth-start'),
  msAuthStatus: () => ipcRenderer.invoke('jarvis:ms-auth-status'),

  // UI
  openExpanded:       () => ipcRenderer.send('jarvis:open-expanded'),
  resetConversation:  () => ipcRenderer.send('jarvis:reset-conversation'),
  startListen:        () => ipcRenderer.send('jarvis:start-listen'),

  // Confirmation
  confirmationResponse: (id, confirmed) => ipcRenderer.send('jarvis:confirmation-response', { id, confirmed }),

  // Events (main → renderer)
  onStateChange:       cb => { ipcRenderer.on('jarvis:state-change',          (_e, d) => cb(d));  return () => ipcRenderer.removeAllListeners('jarvis:state-change') },
  onResponse:          cb => { ipcRenderer.on('jarvis:response',              (_e, d) => cb(d));  return () => ipcRenderer.removeAllListeners('jarvis:response') },
  onActivateListen:    cb => { ipcRenderer.on('jarvis:activate-listen',       ()      => cb());   return () => ipcRenderer.removeAllListeners('jarvis:activate-listen') },
  onTranscription:     cb => { ipcRenderer.on('jarvis:transcription',         (_e, d) => cb(d));  return () => ipcRenderer.removeAllListeners('jarvis:transcription') },
  onSpeak:             cb => { ipcRenderer.on('jarvis:speak',                 (_e, d) => cb(d));  return () => ipcRenderer.removeAllListeners('jarvis:speak') },
  onNotifyOpenTab:     cb => { ipcRenderer.on('jarvis:notify-open-tab',       (_e, t) => cb(t));  return () => ipcRenderer.removeAllListeners('jarvis:notify-open-tab') },
  onConfigUpdated:     cb => { ipcRenderer.on('jarvis:config-updated',        (_e, d) => cb(d));  return () => ipcRenderer.removeAllListeners('jarvis:config-updated') },
  onConfirmationRequest:  cb => { ipcRenderer.on('jarvis:confirmation-request',  (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('jarvis:confirmation-request') },
  onProactiveAlert:       cb => { ipcRenderer.on('jarvis:proactive-alert',        (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('jarvis:proactive-alert') },

  // Jarvis Core (mission events + connection state)
  onCoreEvent:  cb => { ipcRenderer.on('jarvis:event',       (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('jarvis:event') },
  onCoreStatus: cb => { ipcRenderer.on('jarvis:core-status', (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('jarvis:core-status') },
  coreStatus:        ()     => ipcRenderer.invoke('jarvis:core-status'),
  coreMissions:      ()     => ipcRenderer.invoke('jarvis:core-missions'),
  coreMissionAgents: id     => ipcRenderer.invoke('jarvis:core-mission-agents', id),
  coreCreateMission: prompt => ipcRenderer.invoke('jarvis:core-create-mission', prompt),
  coreSchedules:       ()             => ipcRenderer.invoke('jarvis:core-schedules'),
  coreScheduleToggle:  (id, enabled) => ipcRenderer.invoke('jarvis:core-schedule-toggle', id, enabled),
  coreScheduleCreate:  body          => ipcRenderer.invoke('jarvis:core-schedule-create', body),
  coreScheduleUpdate:  (id, body)    => ipcRenderer.invoke('jarvis:core-schedule-update', id, body),
  coreScheduleDelete:  id            => ipcRenderer.invoke('jarvis:core-schedule-delete', id),

  // Undo
  undo:     () => ipcRenderer.invoke('jarvis:undo'),
  undoList: () => ipcRenderer.invoke('jarvis:undo-list'),

  // Ollama
  ollamaStatus:     () => ipcRenderer.invoke('jarvis:ollama-status'),
  ollamaListModels: () => ipcRenderer.invoke('jarvis:ollama-list-models'),
  ollamaSetModel:   (id) => ipcRenderer.invoke('jarvis:ollama-set-model', id),
  switchToNim:      () => ipcRenderer.invoke('jarvis:switch-to-nim')
})
