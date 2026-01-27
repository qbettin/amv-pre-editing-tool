import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ClipProcessResult, BatchProgress } from '../types'

export const useProcessingStore = defineStore('processing', () => {
  // Processing state
  const isProcessing = ref<boolean>(false)
  const currentClipId = ref<string>('')
  const clipIndex = ref<number>(0)
  const totalClips = ref<number>(0)
  const overallProgress = ref<number>(0)
  const clipProgress = ref<number>(0)
  const statusMessage = ref<string>('')

  // Results
  const results = ref<ClipProcessResult[]>([])

  // Computed
  const hasResults = computed(() => results.value.length > 0)
  const successCount = computed(() => results.value.filter(r => r.success).length)
  const failureCount = computed(() => results.value.filter(r => !r.success).length)
  const isComplete = computed(() =>
    !isProcessing.value && results.value.length === totalClips.value && totalClips.value > 0
  )

  // Actions
  const startProcessing = (total: number) => {
    isProcessing.value = true
    totalClips.value = total
    clipIndex.value = 0
    overallProgress.value = 0
    clipProgress.value = 0
    statusMessage.value = 'Starting processing...'
    results.value = []
  }

  const updateProgress = (progress: BatchProgress) => {
    currentClipId.value = progress.clipId
    clipIndex.value = progress.clipIndex
    clipProgress.value = progress.clipProgress
    overallProgress.value = progress.overallProgress
    statusMessage.value = progress.status
  }

  const completeClip = (result: ClipProcessResult) => {
    results.value.push(result)
    if (result.success) {
      statusMessage.value = `Completed clip ${clipIndex.value + 1} of ${totalClips.value}`
    } else {
      statusMessage.value = `Failed clip ${clipIndex.value + 1}: ${result.error}`
    }
  }

  const finishProcessing = (success: boolean = true) => {
    isProcessing.value = false
    overallProgress.value = 100
    clipProgress.value = 100

    if (success) {
      statusMessage.value = `Processing complete! ${successCount.value} of ${totalClips.value} clips processed successfully.`
    } else {
      statusMessage.value = `Processing finished with errors. ${failureCount.value} clips failed.`
    }
  }

  const reset = () => {
    isProcessing.value = false
    currentClipId.value = ''
    clipIndex.value = 0
    totalClips.value = 0
    overallProgress.value = 0
    clipProgress.value = 0
    statusMessage.value = ''
    results.value = []
  }

  return {
    // State
    isProcessing,
    currentClipId,
    clipIndex,
    totalClips,
    overallProgress,
    clipProgress,
    statusMessage,
    results,

    // Computed
    hasResults,
    successCount,
    failureCount,
    isComplete,

    // Actions
    startProcessing,
    updateProgress,
    completeClip,
    finishProcessing,
    reset
  }
})
