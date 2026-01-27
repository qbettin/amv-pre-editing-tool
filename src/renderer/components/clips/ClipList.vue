<template>
  <v-navigation-drawer
    :model-value="true"
    location="right"
    :width="280"
    permanent
    class="clip-list-drawer"
  >
    <div class="pa-4">
      <div class="d-flex align-center justify-space-between mb-4">
        <h3 class="text-h6">Clips</h3>
        <v-chip size="small" color="primary">
          {{ clips.length }}
        </v-chip>
      </div>

      <v-list
        v-if="clips.length > 0"
        density="compact"
        class="clip-list"
      >
        <v-list-item
          v-for="clip in clips"
          :key="clip.id"
          :class="{ 'clip-item--selected': isSelected(clip.id) }"
          class="clip-item mb-2 pa-0"
          rounded
          @click="handleClipClick($event, clip)"
        >
          <div class="clip-content pa-2">
            <!-- Thumbnail -->
            <div class="clip-thumbnail">
              <img
                v-if="clip.thumbnail"
                :src="clip.thumbnail"
                alt="Clip thumbnail"
              />
              <v-icon v-else size="24" color="grey">mdi-video</v-icon>
            </div>

            <!-- Info -->
            <div class="clip-info">
              <div class="clip-name text-truncate">{{ clip.name }}</div>
              <div class="clip-times text-caption text-medium-emphasis">
                {{ formatTime(clip.startTime) }} - {{ formatTime(clip.endTime) }}
              </div>
              <div class="clip-duration text-caption">
                <v-icon size="12" class="mr-1">mdi-timer-outline</v-icon>
                {{ formatDuration(clip.duration) }}
              </div>
            </div>

            <!-- Actions -->
            <div class="clip-actions">
              <v-btn
                icon
                size="x-small"
                variant="text"
                color="error"
                @click.stop="removeClip(clip.id)"
              >
                <v-icon size="16">mdi-delete</v-icon>
                <v-tooltip activator="parent" location="left">Remove Clip</v-tooltip>
              </v-btn>
            </div>
          </div>
        </v-list-item>
      </v-list>

      <!-- Empty State -->
      <div v-else class="empty-state text-center py-8">
        <v-icon size="48" color="grey-darken-1" class="mb-2">mdi-content-cut</v-icon>
        <p class="text-body-2 text-medium-emphasis">No clips yet</p>
        <p class="text-caption text-medium-emphasis">
          Split the timeline and right-click segments to add clips
        </p>
      </div>

      <!-- Instructions -->
      <v-alert
        v-if="clips.length > 0"
        type="info"
        variant="tonal"
        density="compact"
        class="mt-4"
      >
        <div class="text-caption">
          <strong>Tip:</strong> Ctrl+Click to select multiple clips
        </div>
      </v-alert>
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useClipsStore } from '../../stores/clipsStore'
import type { TrimmedClip } from '../../types'

const emit = defineEmits<{
  preview: [clip: TrimmedClip]
}>()

const clipsStore = useClipsStore()

const clips = computed(() => clipsStore.clips)
const selectedClipIds = computed(() => clipsStore.selectedClipIds)

const isSelected = (clipId: string) => {
  return selectedClipIds.value.includes(clipId)
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const frames = Math.floor((seconds % 1) * 30)
  return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}m ${secs}s`
}

const handleClipClick = (event: MouseEvent | KeyboardEvent, clip: TrimmedClip) => {
  let mode: 'single' | 'toggle' = 'single'

  if (event.ctrlKey || event.metaKey) {
    mode = 'toggle'
  }

  clipsStore.selectClip(clip.id, mode)
  emit('preview', clip)
}

const removeClip = (clipId: string) => {
  clipsStore.removeClip(clipId)
}
</script>

<style scoped>
.clip-list-drawer {
  background: rgb(var(--v-theme-surface)) !important;
}

.clip-list {
  background: transparent;
}

.clip-item {
  background: rgb(var(--v-theme-surface-variant));
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.clip-item:hover {
  background: rgba(var(--v-theme-primary), 0.1);
}

.clip-item--selected {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.15);
}

.clip-content {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.clip-thumbnail {
  width: 60px;
  height: 40px;
  border-radius: 4px;
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

.clip-name {
  font-weight: 500;
  font-size: 13px;
}

.clip-times {
  font-family: monospace;
}

.clip-duration {
  display: flex;
  align-items: center;
}

.clip-actions {
  flex-shrink: 0;
}

.empty-state {
  opacity: 0.8;
}
</style>
