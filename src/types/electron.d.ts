export interface ElectronAPI {
  selectFile: () => Promise<string | null>
  transcribeAudio: (filePath: string, modelPath: string, outputFormat: 'txt' | 'vtt' | 'srt') => Promise<string>
  onTranscriptionStatus: (callback: (status: string) => void) => void
  checkDependencies: () => Promise<{
    ffmpeg: boolean
    whisper: boolean
    model: boolean
    resourcesPath: string
  }>
  getModels: () => Promise<Array<{ name: string; path: string }>>
  downloadModel: (url: string, filename: string, onProgress: (progress: number, status: string) => void) => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
