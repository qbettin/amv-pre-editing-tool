<template>
  <div class="step-export pa-6">
    <div class="export-content">
      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-4">
        <div>
          <h2 class="text-h5 mb-1">Export Clips</h2>
          <p class="text-body-2 text-medium-emphasis">
            Review your clips and select an output directory to begin processing.
          </p>
        </div>
      </div>

      <!-- Output Directory -->
      <v-card variant="outlined" class="mb-4 pa-4">
        <div class="d-flex align-center ga-4">
          <v-icon size="32" color="primary">mdi-folder-outline</v-icon>
          <div class="flex-grow-1">
            <label class="text-body-2 text-medium-emphasis d-block mb-1">Output Directory</label>
            <v-text-field
              :model-value="outputDirectory"
              placeholder="Select output folder..."
              readonly
              variant="outlined"
              density="compact"
              hide-details
            />
          </div>
          <v-btn
            color="primary"
            @click="selectOutputDirectory"
          >
            <v-icon start>mdi-folder-open</v-icon>
            Browse
          </v-btn>
        </div>
      </v-card>

      <!-- Export Summary -->
      <v-card variant="outlined" class="mb-4">
        <v-card-title class="text-subtitle-1">
          Export Summary
        </v-card-title>
        <v-divider />
        <v-table density="compact">
          <thead>
            <tr>
              <th class="text-left">Clip</th>
              <th class="text-left">Duration</th>
              <th class="text-left">Mode</th>
              <th class="text-left">Output File</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="clip in clips" :key="clip.id">
              <td>
                <div class="d-flex align-center ga-2">
                  <div class="mini-thumbnail">
                    <img
                      v-if="clip.thumbnail"
                      :src="clip.thumbnail"
                      alt=""
                    />
                    <v-icon v-else size="16" color="grey">mdi-video</v-icon>
                  </div>
                  {{ clip.name }}
                </div>
              </td>
              <td class="text-medium-emphasis">{{ formatDuration(clip.duration) }}</td>
              <td>
                <v-chip size="x-small" :color="clip.settings.mode === 'character' ? 'primary' : 'secondary'">
                  {{ clip.settings.mode }}
                </v-chip>
              </td>
              <td class="font-weight-medium">
                {{ clip.settings.outputName }}.mp4
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <!-- Warnings -->
      <v-alert
        v-if="!outputDirectory"
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        Please select an output directory to continue.
      </v-alert>

      <v-alert
        v-if="hasDuplicateNames"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        Duplicate output filenames detected. Please ensure all clips have unique names.
      </v-alert>

      <!-- Processing Info -->
      <v-alert
        type="info"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        <strong>Note:</strong> Each clip will be trimmed from the source video and processed
        with your selected settings. This may take several minutes depending on clip length
        and your computer's performance.
      </v-alert>
    </div>

    <!-- Navigation -->
    <div class="step-actions d-flex mt-6">
      <v-btn
        variant="outlined"
        size="large"
        :disabled="isProcessing"
        @click="emit('back')"
      >
        <v-icon start>mdi-arrow-left</v-icon>
        Back
      </v-btn>

      <v-spacer />

      <v-btn
        color="success"
        size="large"
        :disabled="!canExport"
        :loading="isProcessing"
        @click="startExport"
      >
        <v-icon start>mdi-export</v-icon>
        Export All Clips
      </v-btn>
    </div>

    <!-- Progress Dialog -->
    <ProgressDialog
      v-model="showProgressDialog"
      @start-over="handleStartOver"
      @close="handleClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useVideoStore } from '../../stores/videoStore'
import { useClipsStore } from '../../stores/clipsStore'
import { useProcessingStore } from '../../stores/processingStore'
import ProgressDialog from '../ProgressDialog.vue'

const emit = defineEmits<{
  back: []
  reset: []
}>()

const videoStore = useVideoStore()
const clipsStore = useClipsStore()
const processingStore = useProcessingStore()

const showProgressDialog = ref(false)

const clips = computed(() => clipsStore.clips)
const outputDirectory = computed(() => clipsStore.outputDirectory)
const isProcessing = computed(() => processingStore.isProcessing)

const hasDuplicateNames = computed(() => {
  const names = clips.value.map(c => c.settings.outputName)
  return new Set(names).size !== names.length
})

const canExport = computed(() => {
  return (
    outputDirectory.value &&
    clips.value.length > 0 &&
    clips.value.every(c => c.settings.outputName.trim()) &&
    !hasDuplicateNames.value &&
    !isProcessing.value
  )
})

const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}m ${secs}s`
}

const selectOutputDirectory = async () => {
  try {
    const dir = await window.electronAPI.selectOutput()
    if (dir) {
      clipsStore.setOutputDirectory(dir)
    }
  } catch (error) {
    console.error('Failed to select output directory:', error)
  }
}

const startExport = async () => {
  if (!canExport.value) return

  // Set up progress listener
  window.electronAPI.onBatchProgress((progress) => {
    processingStore.updateProgress(progress)
  })

  // Start processing
  processingStore.startProcessing(clips.value.length)
  showProgressDialog.value = true

  try {
    // Convert reactive clips to plain objects for IPC serialization
    const plainClips = JSON.parse(JSON.stringify(clips.value))

    const result = await window.electronAPI.processClips({
      inputPath: videoStore.videoPath,
      outputDir: outputDirectory.value,
      clips: plainClips
    })

    // Update results
    result.results.forEach(r => {
      processingStore.completeClip(r)
    })

    processingStore.finishProcessing(result.success)
  } catch (error) {
    console.error('Export failed:', error)
    processingStore.finishProcessing(false)
  }
}

const handleStartOver = () => {
  showProgressDialog.value = false
  emit('reset')
}

const handleClose = () => {
  showProgressDialog.value = false
}

// Cleanup listeners on unmount
onUnmounted(() => {
  window.electronAPI.removeBatchProgressListener()
})
</script>

<style scoped>
.step-export {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.export-content {
  flex: 1;
  overflow-y: auto;
}

.step-actions {
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.mini-thumbnail {
  width: 40px;
  height: 28px;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mini-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
