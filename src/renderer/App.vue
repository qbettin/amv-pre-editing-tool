<template>
  <v-app>
    <v-main>
      <v-container fluid class="fill-height gradient-bg pa-4">
        <v-row justify="center" class="h-100">
          <v-col cols="12" class="d-flex flex-column h-100">
            <!-- Header -->
            <div class="text-center mb-4">
              <h1 class="text-h4 text-white font-weight-bold">AMV Pre-Editing Tool</h1>
              <p class="text-subtitle-2 text-white-darken-2">Remove dead frames from your AMV clips</p>
            </div>

            <!-- Stepper -->
            <v-card class="flex-grow-1 d-flex flex-column" elevation="24" rounded="xl">
              <v-stepper
                v-model="videoStore.currentStep"
                :items="stepItems"
                alt-labels
                flat
                class="flex-grow-1 d-flex flex-column stepper-container"
              >
                <template v-slot:item.1>
                  <v-slide-x-transition mode="out-in">
                    <Step1Upload @next="goToStep(2)" />
                  </v-slide-x-transition>
                </template>

                <template v-slot:item.2>
                  <v-slide-x-transition mode="out-in">
                    <Step2Trimmer @next="goToStep(3)" @back="goToStep(1)" />
                  </v-slide-x-transition>
                </template>

                <template v-slot:item.3>
                  <v-slide-x-transition mode="out-in">
                    <Step3Settings @next="goToStep(4)" @back="goToStep(2)" />
                  </v-slide-x-transition>
                </template>

                <template v-slot:item.4>
                  <v-slide-x-transition mode="out-in">
                    <Step4Export @back="goToStep(3)" @reset="handleReset" />
                  </v-slide-x-transition>
                </template>
              </v-stepper>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useVideoStore } from './stores/videoStore'
import { useClipsStore } from './stores/clipsStore'
import { useProcessingStore } from './stores/processingStore'
import Step1Upload from './components/steps/Step1Upload.vue'
import Step2Trimmer from './components/steps/Step2Trimmer.vue'
import Step3Settings from './components/steps/Step3Settings.vue'
import Step4Export from './components/steps/Step4Export.vue'
import type { WizardStep } from './types'

const videoStore = useVideoStore()
const clipsStore = useClipsStore()
const processingStore = useProcessingStore()

const stepItems = computed(() => [
  {
    title: 'Upload',
    value: 1,
    complete: videoStore.hasVideo
  },
  {
    title: 'Trim',
    value: 2,
    complete: clipsStore.hasClips
  },
  {
    title: 'Settings',
    value: 3,
    complete: clipsStore.hasClips && clipsStore.clips.every(c => c.settings.outputName)
  },
  {
    title: 'Export',
    value: 4,
    complete: processingStore.isComplete
  }
])

const goToStep = (step: WizardStep) => {
  // Validation before moving to next step
  if (step === 2 && !videoStore.hasVideo) {
    return
  }
  if (step === 3 && !clipsStore.hasClips) {
    return
  }
  if (step === 4 && !clipsStore.hasClips) {
    return
  }

  videoStore.setStep(step)
}

const handleReset = () => {
  videoStore.reset()
  clipsStore.reset()
  processingStore.reset()
}
</script>

<style scoped>
.gradient-bg {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.h-100 {
  height: 100%;
}

.stepper-container {
  background: transparent;
}

:deep(.v-stepper-header) {
  box-shadow: none;
  background: rgb(var(--v-theme-surface-variant));
  border-radius: 12px 12px 0 0;
}

:deep(.v-stepper-window) {
  flex: 1;
  margin: 0;
  overflow: auto;
}

:deep(.v-stepper-window__container) {
  height: 100%;
}

:deep(.v-stepper-window-item) {
  height: 100%;
}
</style>
