export interface ElectronAPI {
  selectFile: () => Promise<string | null>
  transcribeAudio: (filePath: string, modelPath: string) => Promise<string>
  onTranscriptionStatus: (callback: (status: string) => void) => void
  checkDependencies: () => Promise<{
    ffmpeg: boolean
    whisper: boolean
    model: boolean
    resourcesPath: string
  }>
  getModels: () => Promise<Array<{ name: string; path: string }>>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
