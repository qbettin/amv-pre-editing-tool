import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { VideoMetadata, WizardStep } from '../types'

export const useVideoStore = defineStore('video', () => {
  // Video state
  const videoPath = ref<string>('')
  const videoMetadata = ref<VideoMetadata | null>(null)
  const currentTime = ref<number>(0)
  const isPlaying = ref<boolean>(false)
  const timelineThumbnails = ref<string[]>([])

  // Wizard state
  const currentStep = ref<WizardStep>(1)

  // Computed
  const hasVideo = computed(() => !!videoPath.value && !!videoMetadata.value)
  const duration = computed(() => videoMetadata.value?.duration || 0)
  const fps = computed(() => videoMetadata.value?.fps || 30)
  const frameDuration = computed(() => 1 / fps.value)

  // Actions
  const setVideo = async (path: string) => {
    videoPath.value = path
    try {
      const metadata = await window.electronAPI.getVideoMetadata(path)
      videoMetadata.value = metadata
      return metadata
    } catch (error) {
      console.error('Failed to get video metadata:', error)
      throw error
    }
  }

  const loadTimelineThumbnails = async (count: number = 20) => {
    if (!videoPath.value) return []
    try {
      const thumbnails = await window.electronAPI.extractThumbnails(videoPath.value, count)
      timelineThumbnails.value = thumbnails
      return thumbnails
    } catch (error) {
      console.error('Failed to extract thumbnails:', error)
      return []
    }
  }

  const setCurrentTime = (time: number) => {
    currentTime.value = Math.max(0, Math.min(time, duration.value))
  }

  const setPlaying = (playing: boolean) => {
    isPlaying.value = playing
  }

  const setStep = (step: WizardStep) => {
    currentStep.value = step
  }

  const stepForward = () => {
    setCurrentTime(currentTime.value + frameDuration.value)
  }

  const stepBackward = () => {
    setCurrentTime(currentTime.value - frameDuration.value)
  }

  const reset = () => {
    videoPath.value = ''
    videoMetadata.value = null
    currentTime.value = 0
    isPlaying.value = false
    timelineThumbnails.value = []
    currentStep.value = 1
  }

  return {
    // State
    videoPath,
    videoMetadata,
    currentTime,
    isPlaying,
    timelineThumbnails,
    currentStep,

    // Computed
    hasVideo,
    duration,
    fps,
    frameDuration,

    // Actions
    setVideo,
    loadTimelineThumbnails,
    setCurrentTime,
    setPlaying,
    setStep,
    stepForward,
    stepBackward,
    reset
  }
})
