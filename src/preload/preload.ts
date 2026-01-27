import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI, BatchProgress } from '../renderer/types'

// Store listener references for cleanup
let progressListener: ((_event: Electron.IpcRendererEvent, progress: number) => void) | null = null
let batchProgressListener: ((_event: Electron.IpcRendererEvent, progress: BatchProgress) => void) | null = null

const electronAPI: ElectronAPI = {
  // Existing methods
  selectVideo: () => ipcRenderer.invoke('select-video'),
  selectOutput: () => ipcRenderer.invoke('select-output'),
  processVideo: (options) => ipcRenderer.invoke('process-video', options),
  onProgress: (callback) => {
    // Remove previous listener if exists
    if (progressListener) {
      ipcRenderer.removeListener('processing-progress', progressListener)
    }
    progressListener = (_, progress) => callback(progress)
    ipcRenderer.on('processing-progress', progressListener)
  },

  // New methods for wizard
  getVideoMetadata: (videoPath) => ipcRenderer.invoke('get-video-metadata', videoPath),
  extractThumbnail: (videoPath, time) => ipcRenderer.invoke('extract-thumbnail', videoPath, time),
  extractThumbnails: (videoPath, count) => ipcRenderer.invoke('extract-thumbnails', videoPath, count),
  processClips: (options) => ipcRenderer.invoke('process-clips', options),
  onBatchProgress: (callback) => {
    // Remove previous listener if exists
    if (batchProgressListener) {
      ipcRenderer.removeListener('batch-progress', batchProgressListener)
    }
    batchProgressListener = (_, progress) => callback(progress)
    ipcRenderer.on('batch-progress', batchProgressListener)
  },

  // Cleanup methods
  removeProgressListener: () => {
    if (progressListener) {
      ipcRenderer.removeListener('processing-progress', progressListener)
      progressListener = null
    }
  },
  removeBatchProgressListener: () => {
    if (batchProgressListener) {
      ipcRenderer.removeListener('batch-progress', batchProgressListener)
      batchProgressListener = null
    }
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
