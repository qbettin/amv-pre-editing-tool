import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../renderer/types'

const electronAPI: ElectronAPI = {
  selectVideo: () => ipcRenderer.invoke('select-video'),
  selectOutput: () => ipcRenderer.invoke('select-output'),
  processVideo: (options) => ipcRenderer.invoke('process-video', options),
  onProgress: (callback) => {
    ipcRenderer.on('processing-progress', (_, progress) => callback(progress))
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)