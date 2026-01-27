import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { spawn, execFile } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { fileURLToPath } from 'url'

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Helper to get ffmpeg/ffprobe paths
const getFFmpegPath = () => {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'resources', 'ffmpeg', 'win', 'ffmpeg.exe')
    : path.join(__dirname, '..', 'resources', 'ffmpeg', 'win', 'ffmpeg.exe')
}

const getFFprobePath = () => {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'resources', 'ffmpeg', 'win', 'ffprobe.exe')
    : path.join(__dirname, '..', 'resources', 'ffmpeg', 'win', 'ffprobe.exe')
}

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
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

// Get video metadata using ffprobe
ipcMain.handle('get-video-metadata', async (_event, videoPath: string) => {
  return new Promise((resolve, reject) => {
    const ffprobePath = getFFprobePath()
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      videoPath
    ]

    execFile(ffprobePath, args, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`FFprobe error: ${stderr || error.message}`))
        return
      }

      try {
        const data = JSON.parse(stdout)
        const videoStream = data.streams?.find((s: { codec_type: string }) => s.codec_type === 'video')

        if (!videoStream) {
          reject(new Error('No video stream found'))
          return
        }

        // Parse frame rate (can be "30/1" or "29.97")
        let fps = 30
        if (videoStream.r_frame_rate) {
          const parts = videoStream.r_frame_rate.split('/')
          fps = parts.length === 2 ? parseInt(parts[0]) / parseInt(parts[1]) : parseFloat(parts[0])
        }

        resolve({
          path: videoPath,
          duration: parseFloat(data.format?.duration || '0'),
          fps: Math.round(fps * 100) / 100,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          codec: videoStream.codec_name || 'unknown'
        })
      } catch (parseError) {
        reject(new Error(`Failed to parse ffprobe output: ${parseError}`))
      }
    })
  })
})

// Extract single thumbnail at timestamp
ipcMain.handle('extract-thumbnail', async (_event, videoPath: string, time: number) => {
  return new Promise((resolve, reject) => {
    const ffmpegPath = getFFmpegPath()
    const tempDir = os.tmpdir()
    const outputPath = path.join(tempDir, `thumb_${Date.now()}.jpg`)

    const args = [
      '-ss', time.toString(),
      '-i', videoPath,
      '-vframes', '1',
      '-q:v', '2',
      '-y',
      outputPath
    ]

    execFile(ffmpegPath, args, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(`FFmpeg error: ${stderr || error.message}`))
        return
      }

      try {
        const imageBuffer = fs.readFileSync(outputPath)
        const base64 = imageBuffer.toString('base64')
        fs.unlinkSync(outputPath) // Clean up temp file
        resolve(`data:image/jpeg;base64,${base64}`)
      } catch (readError) {
        reject(new Error(`Failed to read thumbnail: ${readError}`))
      }
    })
  })
})

// Extract multiple thumbnails for timeline
ipcMain.handle('extract-thumbnails', async (_event, videoPath: string, count: number) => {
  // First get video duration
  const metadata = await new Promise<{ duration: number }>((resolve, reject) => {
    const ffprobePath = getFFprobePath()
    execFile(ffprobePath, ['-v', 'quiet', '-print_format', 'json', '-show_format', videoPath],
      (error, stdout) => {
        if (error) {
          reject(error)
          return
        }
        const data = JSON.parse(stdout)
        resolve({ duration: parseFloat(data.format?.duration || '0') })
      }
    )
  })

  const duration = metadata.duration
  const interval = duration / count
  const thumbnails: string[] = []
  const ffmpegPath = getFFmpegPath()
  const tempDir = os.tmpdir()

  for (let i = 0; i < count; i++) {
    const time = i * interval
    const outputPath = path.join(tempDir, `timeline_thumb_${Date.now()}_${i}.jpg`)

    await new Promise<void>((resolve, reject) => {
      const args = [
        '-ss', time.toString(),
        '-i', videoPath,
        '-vframes', '1',
        '-vf', 'scale=160:-1',
        '-q:v', '4',
        '-y',
        outputPath
      ]

      execFile(ffmpegPath, args, (error) => {
        if (error) {
          reject(error)
          return
        }

        try {
          const imageBuffer = fs.readFileSync(outputPath)
          const base64 = imageBuffer.toString('base64')
          fs.unlinkSync(outputPath)
          thumbnails.push(`data:image/jpeg;base64,${base64}`)
          resolve()
        } catch (readError) {
          reject(readError)
        }
      })
    })
  }

  return thumbnails
})

// Process multiple clips (batch)
ipcMain.handle('process-clips', async (event, options) => {
  const { inputPath, outputDir, clips } = options
  const results: Array<{ clipId: string; success: boolean; outputPath?: string; error?: string }> = []
  const totalClips = clips.length

  // Get bundled executables
  const pythonExe = app.isPackaged
    ? path.join(process.resourcesPath, 'resources', 'python-dist', 'frame_processor.exe')
    : path.join(__dirname, '..', 'resources', 'python-dist', 'frame_processor.exe')

  const ffmpegPath = getFFmpegPath()
  process.env.FFMPEG_BINARY = ffmpegPath

  // Debug logging
  console.log('=== Process Clips Debug ===')
  console.log('Input path:', inputPath)
  console.log('Output dir:', outputDir)
  console.log('Python exe:', pythonExe)
  console.log('Python exe exists:', fs.existsSync(pythonExe))
  console.log('FFmpeg path:', ffmpegPath)
  console.log('FFmpeg exists:', fs.existsSync(ffmpegPath))
  console.log('Number of clips:', totalClips)

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]

    // Send progress update
    if (mainWindow) {
      mainWindow.webContents.send('batch-progress', {
        clipId: clip.id,
        clipIndex: i,
        totalClips,
        clipProgress: 0,
        overallProgress: Math.round((i / totalClips) * 100),
        status: `Processing clip ${i + 1} of ${totalClips}: ${clip.name}`
      })
    }

    try {
      // First, trim the video segment to a temp file
      const tempDir = os.tmpdir()
      const trimmedPath = path.join(tempDir, `trimmed_${clip.id}.mp4`)

      await new Promise<void>((resolve, reject) => {
        const duration = clip.endTime - clip.startTime
        const args = [
          '-ss', clip.startTime.toString(),
          '-i', inputPath,
          '-t', duration.toString(),
          '-c', 'copy',
          '-y',
          trimmedPath
        ]

        execFile(ffmpegPath, args, (error, _stdout, stderr) => {
          if (error) {
            reject(new Error(`Trim failed: ${stderr || error.message}`))
            return
          }
          resolve()
        })
      })

      // Then process the trimmed clip
      await new Promise<void>((resolve, reject) => {
        const args = [
          '--input', trimmedPath,
          '--output', outputDir,
          '--mode', clip.settings.mode,
          '--threshold', clip.settings.threshold.toString(),
          '--min-frames', clip.settings.minFrames.toString()
        ]

        // Add custom output name if provided
        if (clip.settings.outputName) {
          args.push('--output-name', clip.settings.outputName)
        }

        console.log('Running Python with args:', args)
        console.log('Trimmed file exists:', fs.existsSync(trimmedPath))

        const pythonProcess = spawn(pythonExe, args)

        let stdoutData = ''
        let stderrData = ''

        pythonProcess.stdout.on('data', (data) => {
          const message = data.toString()
          stdoutData += message
          console.log('Python stdout:', message)
          if (message.includes('PROGRESS:')) {
            const progressMatch = message.match(/PROGRESS: (\d+)/)
            if (progressMatch && mainWindow) {
              const clipProgress = parseInt(progressMatch[1])
              const overallProgress = Math.round(((i + clipProgress / 100) / totalClips) * 100)
              mainWindow.webContents.send('batch-progress', {
                clipId: clip.id,
                clipIndex: i,
                totalClips,
                clipProgress,
                overallProgress,
                status: `Processing clip ${i + 1} of ${totalClips}: ${clipProgress}%`
              })
            }
          }
        })

        pythonProcess.stderr.on('data', (data) => {
          stderrData += data.toString()
          console.error(`Python stderr: ${data}`)
        })

        pythonProcess.on('close', (code) => {
          console.log(`Python process exited with code ${code}`)
          console.log('Final stdout:', stdoutData)
          console.log('Final stderr:', stderrData)

          // Clean up temp file
          try {
            fs.unlinkSync(trimmedPath)
          } catch (e) {
            // Ignore cleanup errors
          }

          if (code === 0) {
            resolve()
          } else {
            reject(new Error(`Processing exited with code ${code}. stderr: ${stderrData}`))
          }
        })

        pythonProcess.on('error', (error) => {
          console.error('Python spawn error:', error)
          reject(error)
        })
      })

      results.push({
        clipId: clip.id,
        success: true,
        outputPath: path.join(outputDir, clip.settings.outputName || clip.name)
      })
    } catch (error) {
      results.push({
        clipId: clip.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // Send final progress
  if (mainWindow) {
    mainWindow.webContents.send('batch-progress', {
      clipId: '',
      clipIndex: totalClips,
      totalClips,
      clipProgress: 100,
      overallProgress: 100,
      status: 'Processing complete!'
    })
  }

  return {
    success: results.every(r => r.success),
    results
  }
})