export interface Clip {
  id: string
  name: string
  path: string
  duration?: number
  thumbnail?: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  settings: ClipSettings
  createdAt: number
}

export interface ClipSettings {
  mode: 'character' | 'full'
  threshold: number
  minFrames: number
  outputName: string
}

export interface ProcessingProgress {
  clipId: string
  progress: number
  status: string
}

export interface ElectronAPI {
  selectVideo: () => Promise<string | null>
  selectOutput: () => Promise<string | null>
  processVideo: (options: ProcessVideoOptions) => Promise<ProcessResult>
  onProgress: (callback: (progress: number) => void) => void
}

export interface ProcessVideoOptions {
  inputPath: string
  outputDir: string
  settings: ClipSettings
}

export interface ProcessResult {
  success: boolean
  message: string
  output?: string
  error?: string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}