<template>
  <v-dialog
    :model-value="modelValue"
    persistent
    max-width="500"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="pa-4">
      <v-card-title class="text-h5 text-center mb-4">
        {{ isComplete ? 'Processing Complete' : 'Processing Clips' }}
      </v-card-title>

      <v-card-text>
        <!-- Current Clip Progress -->
        <div v-if="!isComplete" class="mb-6">
          <div class="d-flex justify-space-between align-center mb-2">
            <span class="text-body-2">Current Clip</span>
            <span class="text-body-2 font-weight-medium">{{ clipProgress }}%</span>
          </div>
          <v-progress-linear
            :model-value="clipProgress"
            color="primary"
            height="12"
            rounded
          />
        </div>

        <!-- Overall Progress -->
        <div class="mb-4">
          <div class="d-flex justify-space-between align-center mb-2">
            <span class="text-body-2">Overall Progress</span>
            <span class="text-body-2 font-weight-medium">
              {{ clipIndex }} of {{ totalClips }} clips
            </span>
          </div>
          <v-progress-linear
            :model-value="overallProgress"
            :color="isComplete ? 'success' : 'secondary'"
            height="16"
            rounded
          >
            <template v-slot:default>
              <span class="text-caption font-weight-bold">{{ overallProgress }}%</span>
            </template>
          </v-progress-linear>
        </div>

        <!-- Status Message -->
        <v-alert
          :type="isComplete ? (hasErrors ? 'warning' : 'success') : 'info'"
          variant="tonal"
          density="compact"
          class="mb-4"
        >
          <div class="d-flex align-center">
            <v-progress-circular
              v-if="!isComplete"
              indeterminate
              size="18"
              width="2"
              class="mr-3"
            />
            <span>{{ statusMessage }}</span>
          </div>
        </v-alert>

        <!-- Results Summary (when complete) -->
        <div v-if="isComplete" class="results-summary">
          <v-row dense>
            <v-col cols="6">
              <v-card variant="tonal" color="success" class="pa-3 text-center">
                <div class="text-h4 font-weight-bold">{{ successCount }}</div>
                <div class="text-caption">Successful</div>
              </v-card>
            </v-col>
            <v-col cols="6">
              <v-card variant="tonal" color="error" class="pa-3 text-center">
                <div class="text-h4 font-weight-bold">{{ failureCount }}</div>
                <div class="text-caption">Failed</div>
              </v-card>
            </v-col>
          </v-row>

          <!-- Error Details -->
          <v-expansion-panels v-if="failedResults.length > 0" class="mt-4">
            <v-expansion-panel>
              <v-expansion-panel-title>
                <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
                View Errors ({{ failedResults.length }})
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list density="compact" class="bg-transparent">
                  <v-list-item
                    v-for="result in failedResults"
                    :key="result.clipId"
                    class="px-0"
                  >
                    <template v-slot:prepend>
                      <v-icon color="error" size="small">mdi-close-circle</v-icon>
                    </template>
                    <v-list-item-title class="text-body-2">
                      {{ getClipName(result.clipId) }}
                    </v-list-item-title>
                    <v-list-item-subtitle class="text-caption text-error">
                      {{ result.error }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
      </v-card-text>

      <!-- Actions (only show when complete) -->
      <v-card-actions v-if="isComplete" class="justify-center pt-4">
        <v-btn
          variant="outlined"
          size="large"
          @click="emit('startOver')"
        >
          <v-icon start>mdi-restart</v-icon>
          Start Over
        </v-btn>
        <v-btn
          color="primary"
          size="large"
          @click="emit('close')"
        >
          <v-icon start>mdi-check</v-icon>
          Done
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProcessingStore } from '../stores/processingStore'
import { useClipsStore } from '../stores/clipsStore'

interface Props {
  modelValue: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  startOver: []
  close: []
}>()

const processingStore = useProcessingStore()
const clipsStore = useClipsStore()

const clipProgress = computed(() => processingStore.clipProgress)
const overallProgress = computed(() => processingStore.overallProgress)
const clipIndex = computed(() => processingStore.clipIndex + 1)
const totalClips = computed(() => processingStore.totalClips)
const statusMessage = computed(() => processingStore.statusMessage)
const isComplete = computed(() => processingStore.isComplete)
const successCount = computed(() => processingStore.successCount)
const failureCount = computed(() => processingStore.failureCount)
const hasErrors = computed(() => failureCount.value > 0)

const failedResults = computed(() =>
  processingStore.results.filter(r => !r.success)
)

const getClipName = (clipId: string) => {
  const clip = clipsStore.clips.find(c => c.id === clipId)
  return clip?.name || clipId
}
</script>

<style scoped>
.results-summary {
  margin-top: 16px;
}
</style>
