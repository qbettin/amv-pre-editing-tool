import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  })

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
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

// IPC Handlers
ipcMain.handle('select-video', async () => {
  if (!mainWindow) return null
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm'] }
    ]
  })

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('select-output', async () => {
  if (!mainWindow) return null
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('process-video', async (event, options) => {
  const { inputPath, outputDir, settings } = options
  
  return new Promise((resolve, reject) => {
    // Get bundled Python executable
    const pythonExe = app.isPackaged
      ? path.join(process.resourcesPath, 'resources', 'python-dist', 'frame_processor.exe')
      : path.join(__dirname, '..', 'resources', 'python-dist', 'frame_processor.exe')

    // Get bundled FFmpeg
    const ffmpegPath = app.isPackaged
      ? path.join(process.resourcesPath, 'resources', 'ffmpeg', 'win', 'ffmpeg.exe')
      : path.join(__dirname, '..', 'resources', 'ffmpeg', 'win', 'ffmpeg.exe')
    
    process.env.FFMPEG_BINARY = ffmpegPath
    
    const args = [
      '--input', inputPath,
      '--output', outputDir,
      '--mode', settings.mode,
      '--threshold', settings.threshold.toString(),
      '--min-frames', settings.minFrames.toString()
    ]

    const pythonProcess = spawn(pythonExe, args)

    let outputData = ''
    let errorData = ''

    pythonProcess.stdout.on('data', (data) => {
      const message = data.toString()
      outputData += message
      
      if (message.includes('PROGRESS:')) {
        const progressMatch = message.match(/PROGRESS: (\d+)/)
        if (progressMatch && mainWindow) {
          mainWindow.webContents.send('processing-progress', parseInt(progressMatch[1]))
        }
      }
      
      console.log(`Python: ${message}`)
    })

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString()
      console.error(`Python Error: ${data}`)
    })

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          message: 'Video processed successfully!',
          output: outputData
        })
      } else {
        reject(new Error(`Processing failed with code ${code}: ${errorData}`))
      }
    })

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`))
    })
  })
})