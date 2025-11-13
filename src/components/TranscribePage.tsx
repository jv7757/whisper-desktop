import { useState, useEffect, useRef } from 'react'
import './TranscribePage.css'

function TranscribePage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [transcription, setTranscription] = useState<string>('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [models, setModels] = useState<Array<{ name: string; path: string }>>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [dependenciesOk, setDependenciesOk] = useState(false)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check dependencies on load
    checkDependencies()
    loadModels()

    // Listen for transcription status updates
    window.electronAPI.onTranscriptionStatus((statusText: string) => {
      setStatus(statusText)
    })
  }, [])

  const checkDependencies = async () => {
    try {
      const deps = await window.electronAPI.checkDependencies()
      const allOk = deps.ffmpeg && deps.whisper && deps.model
      setDependenciesOk(allOk)

      if (!allOk) {
        setStatus('Missing dependencies. Please check settings.')
      }
    } catch (error) {
      console.error('Failed to check dependencies:', error)
      setDependenciesOk(false)
    }
  }

  const loadModels = async () => {
    try {
      const modelList = await window.electronAPI.getModels()
      setModels(modelList)
      if (modelList.length > 0) {
        setSelectedModel(modelList[0].path)
      }
    } catch (error) {
      console.error('Failed to load models:', error)
    }
  }

  const handleFileSelect = async () => {
    try {
      const filePath = await window.electronAPI.selectFile()
      if (filePath) {
        setSelectedFile(filePath)
        setTranscription('')
        setStatus('')
      }
    } catch (error) {
      console.error('Failed to select file:', error)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const file = files[0]
      setSelectedFile(file.path)
      setTranscription('')
      setStatus('')
    }
  }

  const handleTranscribe = async () => {
    if (!selectedFile || !selectedModel) {
      setStatus('Please select a file and model')
      return
    }

    setIsTranscribing(true)
    setTranscription('')
    setStatus('Starting transcription...')

    try {
      const result = await window.electronAPI.transcribeAudio(selectedFile, selectedModel)
      setTranscription(result)
      setStatus('Transcription completed!')
    } catch (error) {
      console.error('Transcription error:', error)
      setStatus(`Error: ${(error as Error).message}`)
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleCopyText = () => {
    if (transcription) {
      navigator.clipboard.writeText(transcription)
      setStatus('Text copied to clipboard!')
      setTimeout(() => setStatus(''), 2000)
    }
  }

  const handleSaveText = () => {
    if (transcription) {
      const blob = new Blob([transcription], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'transcription.txt'
      a.click()
      URL.revokeObjectURL(url)
      setStatus('Text saved!')
      setTimeout(() => setStatus(''), 2000)
    }
  }

  return (
    <div className="transcribe-page">
      <div className="content-area">
        <div
          ref={dropZoneRef}
          className={`drop-zone ${isDragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleFileSelect}
        >
          {selectedFile ? (
            <>
              <div className="file-icon">📁</div>
              <div className="file-name">{selectedFile.split(/[\\/]/).pop()}</div>
              <div className="file-path">{selectedFile}</div>
              <div className="hint">点击更换文件或拖拽新文件到此处</div>
            </>
          ) : (
            <>
              <div className="drop-icon">📥</div>
              <div className="drop-text">拖拽音视频文件到此处</div>
              <div className="drop-hint">或点击选择文件</div>
              <div className="supported-formats">
                支持格式: MP3, M4A, WAV, FLAC, OGG, MP4, AVI, MKV, MOV
              </div>
            </>
          )}
        </div>

        <div className="model-selector">
          <label htmlFor="model-select">选择模型:</label>
          <select
            id="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={models.length === 0}
          >
            {models.length === 0 && (
              <option value="">未找到模型</option>
            )}
            {models.map((model) => (
              <option key={model.path} value={model.path}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        <div className="output-area">
          <div className="output-header">
            <h3>转录文本</h3>
            {transcription && (
              <div className="output-actions">
                <button className="action-btn" onClick={handleCopyText} title="复制文本">
                  📋
                </button>
                <button className="action-btn" onClick={handleSaveText} title="保存文本">
                  💾
                </button>
              </div>
            )}
          </div>
          <textarea
            className="output-text"
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            placeholder="转录的文本将显示在这里..."
            readOnly={isTranscribing}
          />
        </div>
      </div>

      <div className="control-bar">
        <div className="status-area">
          {status && (
            <div className="status-message">
              {isTranscribing && <span className="spinner">⏳</span>}
              {status}
            </div>
          )}
          {!dependenciesOk && !status && (
            <div className="status-message warning">
              ⚠️ 缺少依赖项。请在设置中查看详情。
            </div>
          )}
        </div>
        <button
          className="transcribe-btn"
          onClick={handleTranscribe}
          disabled={!selectedFile || !selectedModel || isTranscribing || !dependenciesOk}
        >
          {isTranscribing ? '转换中...' : '开始转换'}
        </button>
      </div>
    </div>
  )
}

export default TranscribePage
