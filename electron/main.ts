import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron'
import * as path from 'path'
import { spawn } from 'child_process'
import * as fs from 'fs'
import { URL } from 'url'

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
    const url = request.url.substr(6) // Remove 'app://' prefix
    // __dirname is 'dist/', so we need 'dist/renderer'
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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true  // Keep security enabled
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // In production, use custom protocol
    mainWindow.loadURL('app://index.html')
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

ipcMain.handle('transcribe-audio', async (event, filePath: string, modelPath: string) => {
  return new Promise((resolve, reject) => {
    try {
      // Get resources path
      const resourcesPath = isDev
        ? path.join(__dirname, '../../resources')
        : process.resourcesPath

      const ffmpegPath = path.join(resourcesPath, 'bin', process.platform, 'ffmpeg')
      const whisperPath = path.join(resourcesPath, 'bin', process.platform, 'whisper')

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

        const whisper = spawn(whisperPath, [
          '-m', modelPath,
          '-f', wavPath,
          '-t', '4',
          '--output-txt'
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

          // Try to read the output text file
          const txtPath = wavPath.replace('.wav', '.txt')
          let transcription = ''

          if (fs.existsSync(txtPath)) {
            transcription = fs.readFileSync(txtPath, 'utf-8')
            try {
              fs.unlinkSync(txtPath)
            } catch (e) {
              console.error('Failed to delete txt file:', e)
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
    : process.resourcesPath

  const binPath = path.join(resourcesPath, 'bin', process.platform)
  const ffmpegExists = fs.existsSync(path.join(binPath, 'ffmpeg'))
  const whisperExists = fs.existsSync(path.join(binPath, 'whisper'))
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
    : process.resourcesPath

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
