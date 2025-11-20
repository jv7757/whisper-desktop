import { useState, useEffect } from 'react'
import type { AiConfig } from '../types/electron'
import './SettingsPage.css'

interface ModelInfo {
  name: string
  size: string
  description: string
  url: string
}

const AVAILABLE_MODELS: ModelInfo[] = [
  {
    name: 'ggml-tiny.bin',
    size: '75 MB',
    description: '最小模型，速度最快，准确度较低',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin'
  },
  {
    name: 'ggml-base.bin',
    size: '142 MB',
    description: '基础模型，速度和准确度平衡',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin'
  },
  {
    name: 'ggml-small.bin',
    size: '466 MB',
    description: '小型模型，准确度较高',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin'
  },
  {
    name: 'ggml-medium.bin',
    size: '1.5 GB',
    description: '中型模型，准确度高',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin'
  },
  {
    name: 'ggml-large-v3.bin',
    size: '3.1 GB',
    description: '大型模型，准确度最高',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin'
  }
]

function SettingsPage() {
  const [dependencies, setDependencies] = useState({
    ffmpeg: false,
    whisper: false,
    model: false,
    resourcesPath: ''
  })
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadStatus, setDownloadStatus] = useState<string>('')
  const [installedModels, setInstalledModels] = useState<string[]>([])
  const [aiProvider, setAiProvider] = useState<'ollama' | 'openai'>('ollama')
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [ollamaModel, setOllamaModel] = useState('qwen2.5:3b')
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('https://api.openai.com/v1')
  const [openaiModel, setOpenaiModel] = useState('gpt-3.5-turbo')
  const [saveStatus, setSaveStatus] = useState('')

  useEffect(() => {
    checkDependencies()
    loadInstalledModels()
    loadAiConfig()
  }, [])

  const loadAiConfig = async () => {
    try {
      const config = await window.electronAPI.getAiConfig()
      if (config) {
        setAiProvider(config.provider || 'ollama')
        setOllamaUrl(config.ollamaUrl || 'http://localhost:11434')
        setOllamaModel(config.ollamaModel || 'qwen2.5:3b')
        setOpenaiApiKey(config.openaiApiKey || '')
        setOpenaiBaseUrl(config.openaiBaseUrl || 'https://api.openai.com/v1')
        setOpenaiModel(config.openaiModel || 'gpt-3.5-turbo')
      }
    } catch (error) {
      console.error('Failed to load AI config:', error)
    }
  }

  const saveAiConfig = async () => {
    try {
      await window.electronAPI.saveAiConfig({
        provider: aiProvider,
        ollamaUrl,
        ollamaModel,
        openaiApiKey,
        openaiBaseUrl,
        openaiModel
      })
      setSaveStatus('配置已保存！')
      setTimeout(() => setSaveStatus(''), 2000)
    } catch (error) {
      console.error('Failed to save AI config:', error)
      setSaveStatus('保存失败')
    }
  }

  const checkDependencies = async () => {
    try {
      const deps = await window.electronAPI.checkDependencies()
      setDependencies(deps)
    } catch (error) {
      console.error('Failed to check dependencies:', error)
    }
  }

  const loadInstalledModels = async () => {
    try {
      const models = await window.electronAPI.getModels()
      setInstalledModels(models.map(m => m.name + '.bin'))
    } catch (error) {
      console.error('Failed to load models:', error)
    }
  }

  const handleDownloadModel = async (model: ModelInfo) => {
    setDownloadingModel(model.name)
    setDownloadProgress(0)
    setDownloadStatus(`正在下载 ${model.name}...`)

    try {
      await window.electronAPI.downloadModel(model.url, model.name, (progress, status) => {
        setDownloadProgress(progress)
        setDownloadStatus(status)
      })

      setDownloadStatus('下载完成！')
      await loadInstalledModels()
      await checkDependencies()

      setTimeout(() => {
        setDownloadingModel(null)
        setDownloadProgress(0)
        setDownloadStatus('')
      }, 2000)
    } catch (error) {
      console.error('Download failed:', error)
      setDownloadStatus(`下载失败: ${(error as Error).message}`)
      setDownloadingModel(null)
    }
  }

  const getStatusIcon = (status: boolean) => {
    return status ? '✅' : '❌'
  }

  return (
    <div className="settings-page">
      <div className="settings-content">
        <h2 className="settings-title">设置</h2>

        <section className="settings-section">
          <h3 className="section-title">依赖项状态</h3>
          <div className="dependency-list">
            <div className="dependency-item">
              <span className="dep-icon">{getStatusIcon(dependencies.ffmpeg)}</span>
              <div className="dep-info">
                <div className="dep-name">FFmpeg</div>
                <div className="dep-desc">用于音视频格式转换</div>
              </div>
              <span className="dep-status">
                {dependencies.ffmpeg ? '已安装' : '未安装'}
              </span>
            </div>

            <div className="dependency-item">
              <span className="dep-icon">{getStatusIcon(dependencies.whisper)}</span>
              <div className="dep-info">
                <div className="dep-name">Whisper.cpp</div>
                <div className="dep-desc">语音识别引擎</div>
              </div>
              <span className="dep-status">
                {dependencies.whisper ? '已安装' : '未安装'}
              </span>
            </div>

            <div className="dependency-item">
              <span className="dep-icon">{getStatusIcon(dependencies.model)}</span>
              <div className="dep-info">
                <div className="dep-name">Whisper 模型</div>
                <div className="dep-desc">语音识别模型文件</div>
              </div>
              <span className="dep-status">
                {dependencies.model ? '已安装' : '未安装'}
              </span>
            </div>
          </div>

          <button className="refresh-btn" onClick={checkDependencies}>
            🔄 刷新状态
          </button>
        </section>

        <section className="settings-section">
          <h3 className="section-title">路径信息</h3>
          <div className="info-item">
            <div className="info-label">资源目录:</div>
            <div className="info-value">{dependencies.resourcesPath || '未找到'}</div>
          </div>
        </section>

        <section className="settings-section">
          <h3 className="section-title">AI 摘要配置</h3>
          <p className="section-desc">配置用于文本摘要的 AI 服务</p>

          <div className="ai-provider-selector">
            <label>选择 AI 服务:</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  value="ollama"
                  checked={aiProvider === 'ollama'}
                  onChange={() => setAiProvider('ollama')}
                />
                <span>Ollama (本地)</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="openai"
                  checked={aiProvider === 'openai'}
                  onChange={() => setAiProvider('openai')}
                />
                <span>OpenAI</span>
              </label>
            </div>
          </div>

          {aiProvider === 'ollama' && (
            <div className="config-group">
              <h4 className="config-subtitle">Ollama 配置</h4>
              <div className="form-group">
                <label htmlFor="ollama-url">Base URL:</label>
                <input
                  id="ollama-url"
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                />
              </div>
              <div className="form-group">
                <label htmlFor="ollama-model">模型名称:</label>
                <input
                  id="ollama-model"
                  type="text"
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  placeholder="qwen2.5:3b"
                />
              </div>
              <p className="config-hint">
                💡 确保 Ollama 已安装并运行，模型已下载：<code>ollama pull {ollamaModel}</code>
              </p>
            </div>
          )}

          {aiProvider === 'openai' && (
            <div className="config-group">
              <h4 className="config-subtitle">OpenAI 配置</h4>
              <div className="form-group">
                <label htmlFor="openai-key">API Key:</label>
                <input
                  id="openai-key"
                  type="password"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  placeholder="sk-..."
                />
              </div>
              <div className="form-group">
                <label htmlFor="openai-base-url">Base URL:</label>
                <input
                  id="openai-base-url"
                  type="text"
                  value={openaiBaseUrl}
                  onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                />
              </div>
              <div className="form-group">
                <label htmlFor="openai-model">模型名称:</label>
                <input
                  id="openai-model"
                  type="text"
                  value={openaiModel}
                  onChange={(e) => setOpenaiModel(e.target.value)}
                  placeholder="gpt-3.5-turbo"
                />
              </div>
              <p className="config-hint">
                💡 支持 OpenAI 兼容的 API，可以修改 Base URL 使用其他服务
              </p>
            </div>
          )}

          <div className="config-actions">
            <button className="save-config-btn" onClick={saveAiConfig}>
              💾 保存配置
            </button>
            {saveStatus && <span className="save-status">{saveStatus}</span>}
          </div>
        </section>

        <section className="settings-section">
          <h3 className="section-title">模型下载</h3>
          <p className="section-desc">从 Hugging Face 直接下载 Whisper 模型</p>

          {downloadStatus && (
            <div className="download-status">
              <div className="status-text">{downloadStatus}</div>
              {downloadingModel && (
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${downloadProgress}%` }}></div>
                </div>
              )}
            </div>
          )}

          <div className="models-list">
            {AVAILABLE_MODELS.map((model) => {
              const isInstalled = installedModels.includes(model.name)
              const isDownloading = downloadingModel === model.name

              return (
                <div key={model.name} className="model-item">
                  <div className="model-info">
                    <div className="model-header">
                      <span className="model-name">{model.name}</span>
                      <span className="model-size">{model.size}</span>
                      {isInstalled && <span className="model-badge installed">已安装</span>}
                    </div>
                    <div className="model-desc">{model.description}</div>
                  </div>
                  <button
                    className={`download-btn ${isInstalled ? 'installed' : ''}`}
                    onClick={() => handleDownloadModel(model)}
                    disabled={isDownloading || downloadingModel !== null}
                  >
                    {isDownloading ? '下载中...' : isInstalled ? '重新下载' : '下载'}
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        <section className="settings-section">
          <h3 className="section-title">安装说明</h3>
          <div className="instructions">
            <div className="instruction-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>下载 Whisper 模型</h4>
                <p>访问 <a href="https://huggingface.co/ggerganov/whisper.cpp" target="_blank" rel="noopener noreferrer">
                  Hugging Face
                </a> 下载模型文件（推荐 ggml-base.bin 或 ggml-small.bin）</p>
              </div>
            </div>

            <div className="instruction-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>放置模型文件</h4>
                <p>将下载的 .bin 模型文件放入 <code>resources/models/</code> 目录</p>
              </div>
            </div>

            <div className="instruction-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>安装 FFmpeg 和 Whisper.cpp</h4>
                <p>将编译好的二进制文件放入对应平台的目录：</p>
                <ul>
                  <li>Windows: <code>resources/bin/win32/</code></li>
                  <li>macOS: <code>resources/bin/darwin/</code></li>
                  <li>Linux: <code>resources/bin/linux/</code></li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h3 className="section-title">关于</h3>
          <div className="about-info">
            <p><strong>Whisper Desktop</strong></p>
            <p>版本: 1.0.0</p>
            <p>基于 Electron + React + Whisper.cpp 构建</p>
            <p className="license">开源协议: MIT</p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default SettingsPage
