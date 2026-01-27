<template>
  <div class="step-settings pa-6">
    <div class="settings-content">
      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-4">
        <div>
          <h2 class="text-h5 mb-1">Configure Clips</h2>
          <p class="text-body-2 text-medium-emphasis">
            Set processing options for each clip. You can apply settings to all clips at once.
          </p>
        </div>
        <v-chip color="primary" size="large">
          {{ clips.length }} clip{{ clips.length !== 1 ? 's' : '' }}
        </v-chip>
      </div>

      <!-- Bulk Actions -->
      <v-card variant="outlined" class="mb-4 pa-4">
        <div class="d-flex align-center flex-wrap ga-3">
          <span class="text-body-2 text-medium-emphasis">Quick Actions:</span>

          <v-btn
            variant="tonal"
            size="small"
            @click="applyDefaultsToAll"
          >
            <v-icon start size="16">mdi-refresh</v-icon>
            Reset All to Defaults
          </v-btn>

          <v-btn
            variant="tonal"
            size="small"
            @click="generateOutputNames"
          >
            <v-icon start size="16">mdi-format-list-numbered</v-icon>
            Auto-Name All
          </v-btn>
        </div>
      </v-card>

      <!-- Clips Grid -->
      <v-row>
        <v-col
          v-for="clip in clips"
          :key="clip.id"
          cols="12"
          md="6"
          lg="4"
        >
          <ClipCard
            :clip="clip"
            @apply-to-all="applyToAll"
            @remove="removeClip"
          />
        </v-col>
      </v-row>

      <!-- Empty State -->
      <v-alert
        v-if="clips.length === 0"
        type="warning"
        variant="tonal"
        class="mt-4"
      >
        No clips to configure. Go back to the Trim step to add clips.
      </v-alert>

      <!-- Tips -->
      <v-alert
        v-if="clips.length > 0"
        type="info"
        variant="tonal"
        density="compact"
        class="mt-4"
      >
        <strong>Tips:</strong><br>
        <ul class="mt-1 mb-0 pl-4">
          <li><strong>Character Only:</strong> Uses pose detection to track character movement - best for anime clips</li>
          <li><strong>Full Frame:</strong> Simple frame difference detection - faster but less accurate</li>
          <li><strong>Lower threshold:</strong> More sensitive, keeps more frames</li>
          <li><strong>Higher min frames:</strong> Ensures at least X frames are kept per scene</li>
        </ul>
      </v-alert>
    </div>

    <!-- Navigation -->
    <div class="step-actions d-flex mt-6">
      <v-btn
        variant="outlined"
        size="large"
        @click="emit('back')"
      >
        <v-icon start>mdi-arrow-left</v-icon>
        Back
      </v-btn>

      <v-spacer />

      <v-btn
        color="primary"
        size="large"
        :disabled="!canContinue"
        @click="emit('next')"
      >
        Continue to Export
        <v-icon end>mdi-arrow-right</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useClipsStore } from '../../stores/clipsStore'
import ClipCard from '../clips/ClipCard.vue'
import type { TrimmedClip, ClipSettings } from '../../types'

const emit = defineEmits<{
  next: []
  back: []
}>()

const clipsStore = useClipsStore()

const clips = computed(() => clipsStore.clips)

const canContinue = computed(() => {
  return clips.value.length > 0 && clips.value.every(c => c.settings.outputName.trim())
})

const defaultSettings: Partial<ClipSettings> = {
  mode: 'character',
  threshold: 0.02,
  minFrames: 2
}

const applyToAll = (clip: TrimmedClip) => {
  clipsStore.applySettingsToAll({
    mode: clip.settings.mode,
    threshold: clip.settings.threshold,
    minFrames: clip.settings.minFrames
  })
}

const applyDefaultsToAll = () => {
  clipsStore.applySettingsToAll(defaultSettings)
}

const generateOutputNames = () => {
  clips.value.forEach((clip, index) => {
    const baseName = `clip_${(index + 1).toString().padStart(2, '0')}`
    clipsStore.updateClipSettings(clip.id, { outputName: baseName })
  })
}

const removeClip = (clip: TrimmedClip) => {
  clipsStore.removeClip(clip.id)
}
</script>

<style scoped>
.step-settings {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
}

.step-actions {
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
