const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Select video file
  selectVideo: () => ipcRenderer.invoke('select-video'),
  
  // Select output directory
  selectOutput: () => ipcRenderer.invoke('select-output'),
  
  // Process video
  processVideo: (options) => ipcRenderer.invoke('process-video', options),
  
  // Listen for progress updates
  onProgress: (callback) => {
    ipcRenderer.on('processing-progress', (event, progress) => callback(progress));
  }
});