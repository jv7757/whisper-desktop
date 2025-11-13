import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  transcribeAudio: (filePath: string, modelPath: string) =>
    ipcRenderer.invoke('transcribe-audio', filePath, modelPath),
  onTranscriptionStatus: (callback: (status: string) => void) => {
    ipcRenderer.on('transcription-status', (_event, status) => callback(status))
  },
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  getModels: () => ipcRenderer.invoke('get-models')
})
