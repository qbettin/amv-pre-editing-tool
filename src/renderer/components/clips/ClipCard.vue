<template>
  <v-card class="clip-card" variant="outlined">
    <!-- Header with thumbnail and name -->
    <div class="clip-header">
      <div class="clip-thumbnail">
        <img
          v-if="clip.thumbnail"
          :src="clip.thumbnail"
          alt="Clip thumbnail"
        />
        <v-icon v-else size="32" color="grey">mdi-video</v-icon>
      </div>
      <div class="clip-info">
        <v-text-field
          v-model="clipName"
          variant="outlined"
          density="compact"
          label="Clip Name"
          hide-details
          @update:model-value="updateName"
        />
        <div class="clip-times text-caption text-medium-emphasis mt-1">
          {{ formatTime(clip.startTime) }} - {{ formatTime(clip.endTime) }}
          <span class="ml-2">({{ formatDuration(clip.duration) }})</span>
        </div>
      </div>
    </div>

    <v-divider class="my-3" />

    <!-- Settings -->
    <div class="clip-settings pa-3">
      <v-select
        v-model="settings.mode"
        :items="modeOptions"
        label="Detection Mode"
        variant="outlined"
        density="compact"
        hide-details
        class="mb-3"
        @update:model-value="updateSettings"
      />

      <div class="slider-group mb-3">
        <div class="d-flex justify-space-between align-center">
          <label class="text-body-2 text-medium-emphasis">Motion Threshold</label>
          <span class="text-primary font-weight-bold">{{ settings.threshold.toFixed(3) }}</span>
        </div>
        <v-slider
          v-model="settings.threshold"
          :min="0.001"
          :max="0.1"
          :step="0.001"
          color="primary"
          hide-details
          @update:model-value="updateSettings"
        />
      </div>

      <div class="slider-group mb-3">
        <div class="d-flex justify-space-between align-center">
          <label class="text-body-2 text-medium-emphasis">Min Frames to Keep</label>
          <span class="text-primary font-weight-bold">{{ settings.minFrames }}</span>
        </div>
        <v-slider
          v-model="settings.minFrames"
          :min="1"
          :max="5"
          :step="1"
          color="primary"
          hide-details
          @update:model-value="updateSettings"
        />
      </div>

      <v-text-field
        v-model="settings.outputName"
        variant="outlined"
        density="compact"
        label="Output Filename"
        hint="Without extension"
        persistent-hint
        @update:model-value="updateSettings"
      />
    </div>

    <!-- Actions -->
    <v-divider />
    <v-card-actions class="pa-3">
      <v-btn
        variant="tonal"
        color="primary"
        size="small"
        @click="emit('applyToAll', clip)"
      >
        <v-icon start size="16">mdi-content-copy</v-icon>
        Apply to All
        <v-tooltip activator="parent" location="top">
          Apply these settings to all clips
        </v-tooltip>
      </v-btn>

      <v-spacer />

      <v-btn
        icon
        size="small"
        variant="text"
        color="error"
        @click="emit('remove', clip)"
      >
        <v-icon>mdi-delete</v-icon>
        <v-tooltip activator="parent" location="top">Remove Clip</v-tooltip>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useClipsStore } from '../../stores/clipsStore'
import type { TrimmedClip, ClipSettings } from '../../types'

interface Props {
  clip: TrimmedClip
}

const props = defineProps<Props>()

const emit = defineEmits<{
  applyToAll: [clip: TrimmedClip]
  remove: [clip: TrimmedClip]
}>()

const clipsStore = useClipsStore()

const clipName = ref(props.clip.name)

const settings = reactive<ClipSettings>({
  mode: props.clip.settings.mode,
  threshold: props.clip.settings.threshold,
  minFrames: props.clip.settings.minFrames,
  outputName: props.clip.settings.outputName
})

const modeOptions = [
  { title: 'Character Only (Pose Detection)', value: 'character' },
  { title: 'Full Frame (Simple)', value: 'full' }
]

// Watch for external changes to the clip
watch(() => props.clip, (newClip) => {
  clipName.value = newClip.name
  settings.mode = newClip.settings.mode
  settings.threshold = newClip.settings.threshold
  settings.minFrames = newClip.settings.minFrames
  settings.outputName = newClip.settings.outputName
}, { deep: true })

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}m ${secs}s`
}

const updateName = (name: string) => {
  clipsStore.updateClipName(props.clip.id, name)
}

const updateSettings = () => {
  clipsStore.updateClipSettings(props.clip.id, { ...settings })
}
</script>

<style scoped>
.clip-card {
  overflow: hidden;
}

.clip-header {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: rgb(var(--v-theme-surface-variant));
}

.clip-thumbnail {
  width: 120px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.clip-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.clip-info {
  flex: 1;
  min-width: 0;
}

.clip-times {
  font-family: monospace;
}

.clip-settings {
  background: rgb(var(--v-theme-surface));
}

.slider-group {
  /* Slider container styles */
}
</style>
