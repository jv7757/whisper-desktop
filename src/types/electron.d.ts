export interface AiConfig {
  provider: 'ollama' | 'openai'
  ollamaUrl: string
  ollamaModel: string
  openaiApiKey: string
  openaiBaseUrl: string
  openaiModel: string
}

export interface ElectronAPI {
  selectFile: () => Promise<string | null>
  transcribeAudio: (filePath: string, modelPath: string, outputFormat: 'txt' | 'vtt' | 'srt', language: string) => Promise<string>
  onTranscriptionStatus: (callback: (status: string) => void) => void
  checkDependencies: () => Promise<{
    ffmpeg: boolean
    whisper: boolean
    model: boolean
    resourcesPath: string
  }>
  getModels: () => Promise<Array<{ name: string; path: string }>>
  downloadModel: (url: string, filename: string, onProgress: (progress: number, status: string) => void) => Promise<void>
  summarizeText: (text: string, onProgress: (status: string) => void) => Promise<string>
  getAiConfig: () => Promise<AiConfig | null>
  saveAiConfig: (config: AiConfig) => Promise<boolean>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
