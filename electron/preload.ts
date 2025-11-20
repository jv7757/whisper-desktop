import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  transcribeAudio: (filePath: string, modelPath: string, outputFormat: string, language: string) =>
    ipcRenderer.invoke('transcribe-audio', filePath, modelPath, outputFormat, language),
  onTranscriptionStatus: (callback: (status: string) => void) => {
    ipcRenderer.on('transcription-status', (_event, status) => callback(status))
  },
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  getModels: () => ipcRenderer.invoke('get-models'),
  downloadModel: (url: string, filename: string, onProgress: (progress: number, status: string) => void) => {
    // Listen for progress updates
    const progressHandler = (_event: any, progress: number, status: string) => {
      onProgress(progress, status)
    }
    ipcRenderer.on('download-progress', progressHandler)

    // Start download
    return ipcRenderer.invoke('download-model', url, filename).finally(() => {
      // Clean up listener
      ipcRenderer.removeListener('download-progress', progressHandler)
    })
  },
  summarizeText: (text: string, onProgress: (status: string) => void) => {
    // Listen for progress updates
    const progressHandler = (_event: any, status: string) => {
      onProgress(status)
    }
    ipcRenderer.on('summarize-progress', progressHandler)

    // Start summarization
    return ipcRenderer.invoke('summarize-text', text).finally(() => {
      // Clean up listener
      ipcRenderer.removeListener('summarize-progress', progressHandler)
    })
  },
  getAiConfig: () => ipcRenderer.invoke('get-ai-config'),
  saveAiConfig: (config: any) => ipcRenderer.invoke('save-ai-config', config)
})
