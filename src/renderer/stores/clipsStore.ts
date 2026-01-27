import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TimelineSegment, TrimmedClip, ClipSettings, Clip } from '../types'

export const useClipsStore = defineStore('clips', () => {
  // Timeline segments (splits in the video)
  const segments = ref<TimelineSegment[]>([])

  // Clips created from segments
  const clips = ref<TrimmedClip[]>([])

  // Selection state
  const selectedSegmentIds = ref<string[]>([])
  const selectedClipIds = ref<string[]>([])
  const lastSelectedSegmentId = ref<string | null>(null)

  // Output settings
  const outputDirectory = ref<string>('')

  // Legacy clips array (for compatibility)
  const legacyClips = ref<Clip[]>([])

  // Default settings for new clips
  const defaultSettings: ClipSettings = {
    mode: 'character',
    threshold: 0.01,
    minFrames: 2,
    outputName: ''
  }

  // Computed
  const hasClips = computed(() => clips.value.length > 0)
  const selectedClips = computed(() =>
    clips.value.filter(c => selectedClipIds.value.includes(c.id))
  )
  const selectedSegments = computed(() =>
    segments.value.filter(s => selectedSegmentIds.value.includes(s.id))
  )

  // Generate unique ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Initialize with a single segment covering the full video
  const initializeSegments = (duration: number) => {
    segments.value = [{
      id: generateId(),
      startTime: 0,
      endTime: duration,
      isSelected: false
    }]
    clips.value = []
    selectedSegmentIds.value = []
    selectedClipIds.value = []
  }

  // Split segment at a specific time
  const splitAtTime = (time: number) => {
    // Find the segment that contains this time
    const segmentIndex = segments.value.findIndex(
      s => time > s.startTime && time < s.endTime
    )

    if (segmentIndex === -1) return null

    const segment = segments.value[segmentIndex]

    // Create two new segments
    const leftSegment: TimelineSegment = {
      id: generateId(),
      startTime: segment.startTime,
      endTime: time,
      isSelected: false
    }

    const rightSegment: TimelineSegment = {
      id: generateId(),
      startTime: time,
      endTime: segment.endTime,
      isSelected: false
    }

    // Replace the original segment with the two new ones
    segments.value.splice(segmentIndex, 1, leftSegment, rightSegment)

    return { left: leftSegment, right: rightSegment }
  }

  // Add a segment as a clip
  const addSegmentAsClip = async (segmentId: string, thumbnail?: string) => {
    const segment = segments.value.find(s => s.id === segmentId)
    if (!segment) return null

    // Check if already added
    const existing = clips.value.find(c => c.segmentId === segmentId)
    if (existing) return existing

    const clipNumber = clips.value.length + 1
    const newClip: TrimmedClip = {
      id: generateId(),
      segmentId,
      name: `Clip ${clipNumber}`,
      startTime: segment.startTime,
      endTime: segment.endTime,
      duration: segment.endTime - segment.startTime,
      thumbnail,
      settings: { ...defaultSettings, outputName: `clip_${clipNumber}` }
    }

    clips.value.push(newClip)
    segment.isSelected = true

    return newClip
  }

  // Remove clip by segment ID
  const removeClipBySegmentId = (segmentId: string) => {
    const clipIndex = clips.value.findIndex(c => c.segmentId === segmentId)
    if (clipIndex === -1) return

    clips.value.splice(clipIndex, 1)

    const segment = segments.value.find(s => s.id === segmentId)
    if (segment) {
      segment.isSelected = false
    }

    // Remove from selection
    selectedClipIds.value = selectedClipIds.value.filter(id =>
      clips.value.some(c => c.id === id)
    )
  }

  // Remove clip by clip ID
  const removeClip = (clipId: string) => {
    const clip = clips.value.find(c => c.id === clipId)
    if (!clip) return

    removeClipBySegmentId(clip.segmentId)
  }

  // Merge selected segments
  const mergeSelectedSegments = () => {
    if (selectedSegmentIds.value.length < 2) return null

    // Get selected segments sorted by start time
    const toMerge = segments.value
      .filter(s => selectedSegmentIds.value.includes(s.id))
      .sort((a, b) => a.startTime - b.startTime)

    // Check if segments are contiguous
    for (let i = 0; i < toMerge.length - 1; i++) {
      if (toMerge[i].endTime !== toMerge[i + 1].startTime) {
        console.warn('Cannot merge non-contiguous segments')
        return null
      }
    }

    // Remove clips associated with merged segments
    toMerge.forEach(s => {
      const clipIndex = clips.value.findIndex(c => c.segmentId === s.id)
      if (clipIndex !== -1) {
        clips.value.splice(clipIndex, 1)
      }
    })

    // Create merged segment
    const mergedSegment: TimelineSegment = {
      id: generateId(),
      startTime: toMerge[0].startTime,
      endTime: toMerge[toMerge.length - 1].endTime,
      isSelected: false
    }

    // Find insertion point and remove old segments
    const firstIndex = segments.value.findIndex(s => s.id === toMerge[0].id)
    const idsToRemove = toMerge.map(s => s.id)
    segments.value = segments.value.filter(s => !idsToRemove.includes(s.id))

    // Insert merged segment
    segments.value.splice(firstIndex, 0, mergedSegment)

    // Clear selection
    selectedSegmentIds.value = []

    return mergedSegment
  }

  // Selection methods
  const selectSegment = (segmentId: string, mode: 'single' | 'toggle' | 'range' = 'single') => {
    if (mode === 'single') {
      selectedSegmentIds.value = [segmentId]
      lastSelectedSegmentId.value = segmentId
    } else if (mode === 'toggle') {
      const index = selectedSegmentIds.value.indexOf(segmentId)
      if (index === -1) {
        selectedSegmentIds.value.push(segmentId)
      } else {
        selectedSegmentIds.value.splice(index, 1)
      }
      lastSelectedSegmentId.value = segmentId
    } else if (mode === 'range' && lastSelectedSegmentId.value) {
      // Select range between last selected and current
      const lastIndex = segments.value.findIndex(s => s.id === lastSelectedSegmentId.value)
      const currentIndex = segments.value.findIndex(s => s.id === segmentId)

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex)
        const end = Math.max(lastIndex, currentIndex)

        selectedSegmentIds.value = segments.value
          .slice(start, end + 1)
          .map(s => s.id)
      }
    }
  }

  const selectClip = (clipId: string, mode: 'single' | 'toggle' | 'range' = 'single') => {
    if (mode === 'single') {
      selectedClipIds.value = [clipId]
    } else if (mode === 'toggle') {
      const index = selectedClipIds.value.indexOf(clipId)
      if (index === -1) {
        selectedClipIds.value.push(clipId)
      } else {
        selectedClipIds.value.splice(index, 1)
      }
    }
  }

  const clearSelection = () => {
    selectedSegmentIds.value = []
    selectedClipIds.value = []
    lastSelectedSegmentId.value = null
  }

  // Update clip settings
  const updateClipSettings = (clipId: string, settings: Partial<ClipSettings>) => {
    const clip = clips.value.find(c => c.id === clipId)
    if (clip) {
      clip.settings = { ...clip.settings, ...settings }
    }
  }

  // Update clip name
  const updateClipName = (clipId: string, name: string) => {
    const clip = clips.value.find(c => c.id === clipId)
    if (clip) {
      clip.name = name
    }
  }

  // Apply settings to all clips
  const applySettingsToAll = (settings: Partial<ClipSettings>) => {
    clips.value.forEach(clip => {
      clip.settings = { ...clip.settings, ...settings }
    })
  }

  // Set output directory
  const setOutputDirectory = (dir: string) => {
    outputDirectory.value = dir
  }

  // Check if segment has clip
  const segmentHasClip = (segmentId: string) => {
    return clips.value.some(c => c.segmentId === segmentId)
  }

  // Get clip by segment ID
  const getClipBySegmentId = (segmentId: string) => {
    return clips.value.find(c => c.segmentId === segmentId)
  }

  // Reset store
  const reset = () => {
    segments.value = []
    clips.value = []
    selectedSegmentIds.value = []
    selectedClipIds.value = []
    lastSelectedSegmentId.value = null
    outputDirectory.value = ''
  }

  // Legacy compatibility methods
  const addClip = (videoPath: string, settings: ClipSettings) => {
    const newClip: Clip = {
      id: Date.now().toString(),
      name: videoPath.split(/[\\/]/).pop() || 'Unknown',
      path: videoPath,
      status: 'pending',
      settings,
      createdAt: Date.now()
    }
    legacyClips.value.push(newClip)
    return newClip
  }

  const updateClipStatus = (clipId: string, status: Clip['status']) => {
    const clip = legacyClips.value.find(c => c.id === clipId)
    if (clip) {
      clip.status = status
    }
  }

  const pendingClips = computed(() => legacyClips.value.filter(clip => clip.status === 'pending'))
  const processingClips = computed(() => legacyClips.value.filter(clip => clip.status === 'processing'))
  const completedClips = computed(() => legacyClips.value.filter(clip => clip.status === 'completed'))

  return {
    // State
    segments,
    clips,
    selectedSegmentIds,
    selectedClipIds,
    outputDirectory,

    // Computed
    hasClips,
    selectedClips,
    selectedSegments,

    // Segment actions
    initializeSegments,
    splitAtTime,
    mergeSelectedSegments,

    // Clip actions
    addSegmentAsClip,
    removeClip,
    removeClipBySegmentId,
    updateClipSettings,
    updateClipName,
    applySettingsToAll,
    segmentHasClip,
    getClipBySegmentId,

    // Selection
    selectSegment,
    selectClip,
    clearSelection,

    // Other
    setOutputDirectory,
    reset,

    // Legacy compatibility
    legacyClips,
    addClip,
    updateClipStatus,
    pendingClips,
    processingClips,
    completedClips
  }
})
