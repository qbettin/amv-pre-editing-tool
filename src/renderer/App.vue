<template>
  <v-app>
    <v-main>
      <v-container fluid class="fill-height gradient-bg">
        <v-row justify="center" align="center">
          <v-col cols="12" md="10" lg="8">
            <v-card class="pa-8" elevation="24" rounded="xl">
              <!-- Header -->
              <div class="text-center mb-6">
                <h1 class="text-h3 mb-2">AMV Pre-Editing Tool</h1>
                <p class="text-subtitle-1 text-medium-emphasis">Remove dead frames from your amv clips</p>
              </div>

              <!-- Input Video Section -->
              <v-card class="mb-4" variant="outlined">
                <v-card-title class="text-overline">Input Video</v-card-title>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" sm="9">
                      <v-text-field
                        v-model="inputPath"
                        placeholder="Select a video file..."
                        readonly
                        variant="outlined"
                        density="comfortable"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" sm="3">
                      <v-btn
                        @click="selectVideo"
                        color="primary"
                        block
                        size="large"
                      >
                        Browse
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <!-- Output Directory Section -->
              <v-card class="mb-4" variant="outlined">
                <v-card-title class="text-overline">Output Directory</v-card-title>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" sm="9">
                      <v-text-field
                        v-model="outputPath"
                        placeholder="Select output folder..."
                        readonly
                        variant="outlined"
                        density="comfortable"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" sm="3">
                      <v-btn
                        @click="selectOutput"
                        color="primary"
                        block
                        size="large"
                      >
                        Browse
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <!-- Processing Settings Section -->
              <v-card class="mb-4" variant="outlined">
                <v-card-title class="text-overline">Processing Settings</v-card-title>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" md="4">
                      <v-select
                        v-model="settings.mode"
                        :items="modeOptions"
                        label="Detection Mode"
                        variant="outlined"
                        density="comfortable"
                      ></v-select>
                    </v-col>
                    <v-col cols="12" md="4">
                      <label class="text-body-2 text-medium-emphasis">
                        Motion Threshold
                        <span class="text-primary font-weight-bold ml-2">{{ settings.threshold }}</span>
                      </label>
                      <v-slider
                        v-model="settings.threshold"
                        :min="0.001"
                        :max="0.1"
                        :step="0.001"
                        color="primary"
                        thumb-label
                      ></v-slider>
                    </v-col>
                    <v-col cols="12" md="4">
                      <label class="text-body-2 text-medium-emphasis">
                        Min Frames to Keep
                        <span class="text-primary font-weight-bold ml-2">{{ settings.minFrames }}</span>
                      </label>
                      <v-slider
                        v-model="settings.minFrames"
                        :min="1"
                        :max="5"
                        :step="1"
                        color="primary"
                        thumb-label
                      ></v-slider>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <!-- Process Button -->
              <v-btn
                @click="processVideo"
                :disabled="!canProcess"
                color="primary"
                size="x-large"
                block
                class="mb-4"
              >
                Process Video
              </v-btn>

              <!-- Progress Section -->
              <v-card v-if="isProcessing || showResult" class="mb-4" color="surface-variant">
                <v-card-text>
                  <v-progress-linear
                    v-model="progress"
                    color="primary"
                    height="30"
                    rounded
                  >
                    <template v-slot:default>
                      <strong>{{ Math.ceil(progress) }}%</strong>
                    </template>
                  </v-progress-linear>
                  <div class="text-center mt-3" :class="statusColor">
                    {{ statusMessage }}
                  </div>
                </v-card-text>
              </v-card>

              <!-- Info Box -->
              <v-alert
                type="info"
                variant="tonal"
                density="comfortable"
              >
                <strong>Tips:</strong><br>
                • Character Only mode uses pose detection to track character movement<br>
                • Lower threshold = more sensitive (keeps more frames)<br>
                • Min frames ensures at least X frames are kept per scene
              </v-alert>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// State
const inputPath = ref('')
const outputPath = ref('')
const progress = ref(0)
const statusMessage = ref('Processing...')
const isProcessing = ref(false)
const showResult = ref(false)
const statusColor = ref('')

const settings = ref({
  mode: 'character',
  threshold: 0.02,
  minFrames: 1
})

const modeOptions = [
  { title: 'Character Only (Pose Detection)', value: 'character' },
  { title: 'Full Frame (Simple)', value: 'full' }
]

// Computed
const canProcess = computed(() => {
  return inputPath.value && outputPath.value && !isProcessing.value
})

// Methods
const selectVideo = async () => {
  const filePath = await (window as any).electronAPI.selectVideo()
  if (filePath) {
    inputPath.value = filePath
  }
}

const selectOutput = async () => {
  const dirPath = await (window as any).electronAPI.selectOutput()
  if (dirPath) {
    outputPath.value = dirPath
  }
}

const processVideo = async () => {
  isProcessing.value = true
  showResult.value = true
  progress.value = 0
  statusMessage.value = 'Starting processing...'
  statusColor.value = ''

  try {
    const result = await (window as any).electronAPI.processVideo({
      inputPath: inputPath.value,
      outputDir: outputPath.value,
        settings: {
          mode: settings.value.mode,
          threshold: settings.value.threshold,
          minFrames: settings.value.minFrames
      }

    })

    // Success
    progress.value = 100
    statusMessage.value = '✅ ' + result.message
    statusColor.value = 'text-success'

    // Reset after 3 seconds
    setTimeout(() => {
      resetUI()
    }, 3000)

  } catch (error: any) {
    // Error
    statusMessage.value = '❌ ' + error.message
    statusColor.value = 'text-error'
    console.error('Processing error:', error)

    // Reset after 5 seconds
    setTimeout(() => {
      resetUI()
    }, 5000)
  }
}

const resetUI = () => {
  isProcessing.value = false
  showResult.value = false
  statusColor.value = ''
}

// Listen for progress updates
if ((window as any).electronAPI?.onProgress) {
  (window as any).electronAPI.onProgress((progressValue: number) => {
    progress.value = progressValue
    statusMessage.value = `Processing frames... ${progressValue}%`
  })
}
</script>

<style scoped>
.gradient-bg {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}
</style>
