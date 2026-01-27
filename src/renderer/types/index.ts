// Wizard step type
export type WizardStep = 1 | 2 | 3 | 4

// Video metadata from ffprobe
export interface VideoMetadata {
  path: string
  duration: number
  fps: number
  width: number
  height: number
  codec?: string
}

// Timeline segment for splitting video
export interface TimelineSegment {
  id: string
  startTime: number
  endTime: number
  isSelected: boolean
}

// Trimmed clip extends segment with additional info
export interface TrimmedClip {
  id: string
  segmentId: string
  name: string
  startTime: number
  endTime: number
  duration: number
  thumbnail?: string
  settings: ClipSettings
}

// Legacy clip interface (kept for compatibility)
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

// Batch processing progress
export interface BatchProgress {
  clipId: string
  clipIndex: number
  totalClips: number
  clipProgress: number
  overallProgress: number
  status: string
}

// Batch processing result for a single clip
export interface ClipProcessResult {
  clipId: string
  success: boolean
  outputPath?: string
  error?: string
}

// Batch processing options
export interface BatchProcessOptions {
  inputPath: string
  outputDir: string
  clips: TrimmedClip[]
}

export interface ElectronAPI {
  // Existing methods
  selectVideo: () => Promise<string | null>
  selectOutput: () => Promise<string | null>
  processVideo: (options: ProcessVideoOptions) => Promise<ProcessResult>
  onProgress: (callback: (progress: number) => void) => void

  // New methods for wizard
  getVideoMetadata: (videoPath: string) => Promise<VideoMetadata>
  extractThumbnail: (videoPath: string, time: number) => Promise<string>
  extractThumbnails: (videoPath: string, count: number) => Promise<string[]>
  processClips: (options: BatchProcessOptions) => Promise<{ success: boolean; results: ClipProcessResult[] }>
  onBatchProgress: (callback: (progress: BatchProgress) => void) => void
  removeProgressListener: () => void
  removeBatchProgressListener: () => void
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