import { useState, useEffect } from 'react'
import './SettingsPage.css'

function SettingsPage() {
  const [dependencies, setDependencies] = useState({
    ffmpeg: false,
    whisper: false,
    model: false,
    resourcesPath: ''
  })

  useEffect(() => {
    checkDependencies()
  }, [])

  const checkDependencies = async () => {
    try {
      const deps = await window.electronAPI.checkDependencies()
      setDependencies(deps)
    } catch (error) {
      console.error('Failed to check dependencies:', error)
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
