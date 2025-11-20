import { app, BrowserWindow, ipcMain, dialog, protocol, Menu } from 'electron'
import * as path from 'path'
import { spawn } from 'child_process'
import * as fs from 'fs'
import { URL } from 'url'
import * as https from 'https'
import * as http from 'http'

let mainWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV === 'development'

// Set custom protocol as privileged (needed before app is ready)
if (!isDev) {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'app',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: false
      }
    }
  ])
}

// Register custom protocol for loading local files
function registerLocalResourceProtocol() {
  protocol.registerFileProtocol('app', (request, callback) => {
    let url = request.url.substring(6) // Remove 'app://' prefix

    // Remove leading ./ or /
    url = url.replace(/^\.?\/+/, '')

    // Fix: remove 'index.html/' prefix if present (from relative path resolution)
    url = url.replace(/^index\.html\//, '')

    // Decode URL encoding
    url = decodeURIComponent(url)

    // __dirname is 'dist/', renderer files are in 'dist/renderer/'
    const filePath = path.normalize(path.join(__dirname, 'renderer', url))

    callback({ path: filePath })
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true,  // Hide menu bar on Windows and Linux
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true  // Keep security enabled
    }
  })

  // Remove menu bar completely on all platforms
  mainWindow.setMenuBarVisibility(false)

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // In production, use custom protocol
    // Use trailing slash so relative paths resolve correctly
    mainWindow.loadURL('app://./index.html')
    // Uncomment to debug packaged app
    // mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  // Register custom protocol before creating window
  if (!isDev) {
    registerLocalResourceProtocol()
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Audio/Video Files', extensions: ['mp3', 'm4a', 'wav', 'flac', 'ogg', 'mp4', 'avi', 'mkv', 'mov'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('transcribe-audio', async (event, filePath: string, modelPath: string, outputFormat: string) => {
  return new Promise((resolve, reject) => {
    try {
      // Get resources path
      const resourcesPath = isDev
        ? path.join(__dirname, '../../resources')
        : path.join(process.resourcesPath, 'resources')

      // Add .exe extension for Windows
      const ffmpegBinary = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
      const whisperBinary = process.platform === 'win32' ? 'whisper.exe' : 'whisper'

      const ffmpegPath = path.join(resourcesPath, 'bin', process.platform, ffmpegBinary)
      const whisperPath = path.join(resourcesPath, 'bin', process.platform, whisperBinary)

      // Step 1: Convert to WAV using ffmpeg
      const wavPath = path.join(app.getPath('temp'), `temp_audio_${Date.now()}.wav`)

      event.sender.send('transcription-status', 'Converting audio to WAV format...')

      const ffmpeg = spawn(ffmpegPath, [
        '-i', filePath,
        '-ar', '16000',
        '-ac', '1',
        '-c:a', 'pcm_s16le',
        wavPath
      ])

      let ffmpegError = ''
      ffmpeg.stderr.on('data', (data) => {
        ffmpegError += data.toString()
        // Send progress updates
        const timeMatch = data.toString().match(/time=(\d+:\d+:\d+\.\d+)/)
        if (timeMatch) {
          event.sender.send('transcription-status', `Converting: ${timeMatch[1]}`)
        }
      })

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFmpeg failed: ${ffmpegError}`))
          return
        }

        // Step 2: Run Whisper transcription
        event.sender.send('transcription-status', 'Transcribing audio...')

        // Determine output format flag
        const outputFlag = outputFormat === 'txt' ? '--output-txt' :
                          outputFormat === 'vtt' ? '--output-vtt' :
                          '--output-srt'

        const whisper = spawn(whisperPath, [
          '-m', modelPath,
          '-f', wavPath,
          '-t', '4',
          outputFlag
        ])

        let whisperOutput = ''
        let whisperError = ''

        whisper.stdout.on('data', (data) => {
          whisperOutput += data.toString()
          event.sender.send('transcription-status', 'Processing...')
        })

        whisper.stderr.on('data', (data) => {
          whisperError += data.toString()
          // Parse progress from stderr if available
          const progressMatch = data.toString().match(/progress\s*=\s*(\d+)/)
          if (progressMatch) {
            event.sender.send('transcription-status', `Transcribing: ${progressMatch[1]}%`)
          }
        })

        whisper.on('close', (code) => {
          // Clean up temp file
          try {
            fs.unlinkSync(wavPath)
          } catch (e) {
            console.error('Failed to delete temp file:', e)
          }

          if (code !== 0) {
            reject(new Error(`Whisper failed: ${whisperError}`))
            return
          }

          // Try to read the output file based on format
          const outputExt = outputFormat === 'txt' ? '.txt' :
                           outputFormat === 'vtt' ? '.vtt' :
                           '.srt'
          const outputPath = wavPath.replace('.wav', outputExt)
          let transcription = ''

          if (fs.existsSync(outputPath)) {
            transcription = fs.readFileSync(outputPath, 'utf-8')
            try {
              fs.unlinkSync(outputPath)
            } catch (e) {
              console.error(`Failed to delete ${outputExt} file:`, e)
            }
          } else {
            transcription = whisperOutput
          }

          resolve(transcription.trim())
        })

        whisper.on('error', (error) => {
          try {
            fs.unlinkSync(wavPath)
          } catch (e) {}
          reject(error)
        })
      })

      ffmpeg.on('error', (error) => {
        reject(error)
      })

    } catch (error) {
      reject(error)
    }
  })
})

ipcMain.handle('check-dependencies', async () => {
  const resourcesPath = isDev
    ? path.join(__dirname, '../../resources')
    : path.join(process.resourcesPath, 'resources')

  // Add .exe extension for Windows
  const ffmpegBinary = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  const whisperBinary = process.platform === 'win32' ? 'whisper.exe' : 'whisper'

  const binPath = path.join(resourcesPath, 'bin', process.platform)
  const ffmpegExists = fs.existsSync(path.join(binPath, ffmpegBinary))
  const whisperExists = fs.existsSync(path.join(binPath, whisperBinary))
  const modelPath = path.join(resourcesPath, 'models')
  const modelExists = fs.existsSync(modelPath) && fs.readdirSync(modelPath).some(f => f.endsWith('.bin'))

  return {
    ffmpeg: ffmpegExists,
    whisper: whisperExists,
    model: modelExists,
    resourcesPath
  }
})

ipcMain.handle('get-models', async () => {
  const resourcesPath = isDev
    ? path.join(__dirname, '../../resources')
    : path.join(process.resourcesPath, 'resources')

  const modelsPath = path.join(resourcesPath, 'models')

  if (!fs.existsSync(modelsPath)) {
    return []
  }

  const files = fs.readdirSync(modelsPath)
  return files.filter(f => f.endsWith('.bin')).map(f => ({
    name: f.replace('.bin', ''),
    path: path.join(modelsPath, f)
  }))
})

ipcMain.handle('download-model', async (event, url: string, filename: string) => {
  return new Promise((resolve, reject) => {
    const resourcesPath = isDev
      ? path.join(__dirname, '../../resources')
      : path.join(process.resourcesPath, 'resources')

    const modelsPath = path.join(resourcesPath, 'models')

    // Ensure models directory exists
    if (!fs.existsSync(modelsPath)) {
      fs.mkdirSync(modelsPath, { recursive: true })
    }

    const filePath = path.join(modelsPath, filename)

    event.sender.send('download-progress', 0, '开始下载...')

    // Recursive function to handle redirects
    function downloadFile(downloadUrl: string, redirectCount = 0) {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'))
        return
      }

      https.get(downloadUrl, (response) => {
        // Handle redirects
        if (response.statusCode === 302 || response.statusCode === 301) {
          const redirectUrl = response.headers.location
          if (redirectUrl) {
            event.sender.send('download-progress', 0, '跟随重定向...')
            downloadFile(redirectUrl, redirectCount + 1)
            return
          }
        }

        // Check for success status
        if (response.statusCode !== 200) {
          reject(new Error(`下载失败: HTTP ${response.statusCode}`))
          return
        }

        // Start actual download
        const file = fs.createWriteStream(filePath)
        const totalSize = parseInt(response.headers['content-length'] || '0', 10)
        let downloadedSize = 0
        let lastProgressUpdate = 0

        response.on('data', (chunk: Buffer) => {
          downloadedSize += chunk.length

          // Write chunk to file
          const canContinue = file.write(chunk)
          if (!canContinue) {
            response.pause()
          }

          // Calculate progress
          let progress = 0
          let statusText = ''

          if (totalSize > 0) {
            progress = Math.round((downloadedSize / totalSize) * 100)
            const downloadedMB = (downloadedSize / 1024 / 1024).toFixed(2)
            const totalMB = (totalSize / 1024 / 1024).toFixed(2)
            statusText = `下载中... ${downloadedMB}MB / ${totalMB}MB (${progress}%)`
          } else {
            // If we don't have total size, just show downloaded amount
            const downloadedMB = (downloadedSize / 1024 / 1024).toFixed(2)
            statusText = `下载中... ${downloadedMB}MB`
            progress = 0
          }

          // Only send update if progress changed by at least 1% or every 1MB to avoid too many updates
          const progressDiff = Math.abs(progress - lastProgressUpdate)
          if (progressDiff >= 1 || downloadedSize % (1024 * 1024) < chunk.length) {
            event.sender.send('download-progress', progress, statusText)
            lastProgressUpdate = progress
          }
        })

        file.on('drain', () => {
          response.resume()
        })

        response.on('end', () => {
          file.end()
          event.sender.send('download-progress', 100, '下载完成')
          resolve(undefined)
        })

        response.on('error', (error) => {
          console.error('Response error:', error)
          file.close()
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
          }
          reject(error)
        })

        file.on('error', (error) => {
          console.error('File write error:', error)
          file.close()
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
          }
          reject(error)
        })
      }).on('error', (error) => {
        console.error('HTTPS request error:', error)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
        reject(error)
      })
    }

    // Start the download
    downloadFile(url)
  })
})

// AI Config storage
const getConfigPath = () => {
  return path.join(app.getPath('userData'), 'ai-config.json')
}

ipcMain.handle('get-ai-config', async () => {
  try {
    const configPath = getConfigPath()
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8')
      return JSON.parse(data)
    }
    return null
  } catch (error) {
    console.error('Failed to read AI config:', error)
    return null
  }
})

ipcMain.handle('save-ai-config', async (event, config) => {
  try {
    const configPath = getConfigPath()
    const configDir = path.dirname(configPath)

    // Ensure directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('Failed to save AI config:', error)
    throw error
  }
})

ipcMain.handle('summarize-text', async (event, text: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Load AI config
      let config = null
      try {
        const configPath = getConfigPath()
        if (fs.existsSync(configPath)) {
          const data = fs.readFileSync(configPath, 'utf-8')
          config = JSON.parse(data)
        }
      } catch (error) {
        console.error('Failed to load config:', error)
      }

      const provider = config?.provider || 'ollama'
      const prompt = `请对以下文本进行总结摘要，要求简洁明了，提取关键信息：\n\n${text}`

      if (provider === 'ollama') {
        // Ollama implementation
        const ollamaUrl = config?.ollamaUrl || 'http://localhost:11434'
        const model = config?.ollamaModel || 'qwen2.5:3b'
        const apiUrl = `${ollamaUrl}/api/generate`

        const postData = JSON.stringify({
          model: model,
          prompt: prompt,
          stream: false
        })

        const url = new URL(apiUrl)
        const isHttps = url.protocol === 'https:'
        const httpModule = isHttps ? https : http

        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        }

        event.sender.send('summarize-progress', '正在连接 Ollama...')

        const req = httpModule.request(apiUrl, options, (res) => {
          let responseData = ''

          res.on('data', (chunk) => {
            responseData += chunk.toString()
            event.sender.send('summarize-progress', '正在生成摘要...')
          })

          res.on('end', () => {
            try {
              const result = JSON.parse(responseData)
              if (result.response) {
                event.sender.send('summarize-progress', '摘要生成完成')
                resolve(result.response)
              } else {
                reject(new Error('Ollama 响应格式错误'))
              }
            } catch (error) {
              reject(new Error('解析 Ollama 响应失败: ' + (error as Error).message))
            }
          })
        })

        req.on('error', (error) => {
          console.error('Ollama request error:', error)
          reject(new Error(`无法连接到 Ollama (${ollamaUrl})。请确保 Ollama 正在运行`))
        })

        req.write(postData)
        req.end()
      } else if (provider === 'openai') {
        // OpenAI implementation
        const apiKey = config?.openaiApiKey
        if (!apiKey) {
          reject(new Error('未配置 OpenAI API Key'))
          return
        }

        const baseUrl = config?.openaiBaseUrl || 'https://api.openai.com/v1'
        const model = config?.openaiModel || 'gpt-3.5-turbo'
        const apiUrl = `${baseUrl}/chat/completions`

        const postData = JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的文本摘要助手，擅长提取关键信息并进行简洁明了的总结。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7
        })

        const url = new URL(apiUrl)
        const isHttps = url.protocol === 'https:'
        const httpModule = isHttps ? https : http

        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Content-Length': Buffer.byteLength(postData)
          }
        }

        event.sender.send('summarize-progress', '正在连接 OpenAI...')

        const req = httpModule.request(apiUrl, options, (res) => {
          let responseData = ''

          res.on('data', (chunk) => {
            responseData += chunk.toString()
            event.sender.send('summarize-progress', '正在生成摘要...')
          })

          res.on('end', () => {
            try {
              const result = JSON.parse(responseData)
              if (result.choices && result.choices[0]?.message?.content) {
                event.sender.send('summarize-progress', '摘要生成完成')
                resolve(result.choices[0].message.content)
              } else if (result.error) {
                reject(new Error(`OpenAI API 错误: ${result.error.message || JSON.stringify(result.error)}`))
              } else {
                reject(new Error('OpenAI 响应格式错误'))
              }
            } catch (error) {
              reject(new Error('解析 OpenAI 响应失败: ' + (error as Error).message))
            }
          })
        })

        req.on('error', (error) => {
          console.error('OpenAI request error:', error)
          reject(new Error(`无法连接到 OpenAI API (${baseUrl})`))
        })

        req.write(postData)
        req.end()
      } else {
        reject(new Error('未知的 AI 服务提供商'))
      }
    } catch (error) {
      reject(error)
    }
  })
})
