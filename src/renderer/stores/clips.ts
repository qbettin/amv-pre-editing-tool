import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Clip, ClipSettings } from '../types'

export const useClipsStore = defineStore('clips', () => {
  const clips = ref<Clip[]>([])
  const selectedOutputDir = ref<string>('')

  const addClip = (videoPath: string, settings: ClipSettings) => {
    const newClip: Clip = {
      id: Date.now().toString(),
      name: videoPath.split(/[\\/]/).pop() || 'Unknown',
      path: videoPath,
      status: 'pending',
      settings,
      createdAt: Date.now()
    }
    clips.value.push(newClip)
    return newClip
  }

  const removeClip = (clipId: string) => {
    const index = clips.value.findIndex(clip => clip.id === clipId)
    if (index > -1) {
      clips.value.splice(index, 1)
    }
  }

  const updateClipStatus = (clipId: string, status: Clip['status']) => {
    const clip = clips.value.find(c => c.id === clipId)
    if (clip) {
      clip.status = status
    }
  }

  const pendingClips = computed(() => clips.value.filter(clip => clip.status === 'pending'))
  const processingClips = computed(() => clips.value.filter(clip => clip.status === 'processing'))
  const completedClips = computed(() => clips.value.filter(clip => clip.status === 'completed'))

  return {
    clips,
    selectedOutputDir,
    addClip,
    removeClip,
    updateClipStatus,
    pendingClips,
    processingClips,
    completedClips
  }
})