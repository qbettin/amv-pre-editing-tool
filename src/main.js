const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;

// Create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Open DevTools in development
  // mainWindow.webContents.openDevTools();
}

// App initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle file selection dialog
ipcMain.handle('select-video', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Handle output directory selection
ipcMain.handle('select-output', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Process video with Python script
ipcMain.handle('process-video', async (event, options) => {
  const { inputPath, outputDir, settings } = options;
  
  return new Promise((resolve, reject) => {
    // Path to Python script
    const pythonScript = path.join(__dirname, '..', 'python', 'frame_processor.py');
    
    // Build arguments for Python script
    const args = [
      pythonScript,
      '--input', inputPath,
      '--output', outputDir,
      '--mode', settings.mode,
      '--threshold', settings.threshold.toString(),
      '--min-frames', settings.minFrames.toString()
    ];

    // Spawn Python process
    const pythonProcess = spawn('python', args);

    let outputData = '';
    let errorData = '';

    // Capture stdout (progress updates)
    pythonProcess.stdout.on('data', (data) => {
      const message = data.toString();
      outputData += message;
      
      // Send progress updates to renderer
      if (message.includes('PROGRESS:')) {
        const progressMatch = message.match(/PROGRESS: (\d+)/);
        if (progressMatch) {
          event.sender.send('processing-progress', parseInt(progressMatch[1]));
        }
      }
      
      console.log(`Python: ${message}`);
    });

    // Capture stderr (errors)
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error(`Python Error: ${data}`);
    });

    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          message: 'Video processed successfully!',
          output: outputData
        });
      } else {
        reject({
          success: false,
          message: `Processing failed with code ${code}`,
          error: errorData
        });
      }
    });

    // Handle process errors
    pythonProcess.on('error', (error) => {
      reject({
        success: false,
        message: 'Failed to start Python process',
        error: error.message
      });
    });
  });
});