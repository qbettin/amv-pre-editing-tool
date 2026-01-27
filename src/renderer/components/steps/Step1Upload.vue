<template>
  <div class="step-upload pa-6">
    <div class="upload-container">
      <!-- Upload Area (when no video) -->
      <div v-if="!videoStore.hasVideo" class="upload-area">
        <v-card
          class="upload-card d-flex flex-column align-center justify-center pa-8"
          variant="outlined"
          @click="selectVideo"
          :loading="isLoading"
        >
          <v-icon size="80" color="primary" class="mb-4">mdi-video-plus</v-icon>
          <h2 class="text-h5 mb-2">Select a Video</h2>
          <p class="text-body-2 text-medium-emphasis text-center">
            Click to browse or drag and drop a video file
          </p>
          <p class="text-caption text-medium-emphasis mt-2">
            Supported formats: MP4, MKV, AVI, MOV, WebM
          </p>

          <v-btn
            color="primary"
            size="large"
            class="mt-6"
            :loading="isLoading"
            @click.stop="selectVideo"
          >
            <v-icon start>mdi-folder-open</v-icon>
            Browse Files
          </v-btn>
        </v-card>
      </div>

      <!-- Video Preview (when video loaded) -->
      <div v-else class="video-preview">
        <v-row>
          <v-col cols="12" lg="8">
            <v-card variant="outlined" class="mb-4">
              <VideoPlayer
                ref="playerRef"
                :src="videoStore.videoPath"
                :fps="videoStore.fps"
                controls
                @loadedmetadata="onVideoLoaded"
              />
            </v-card>
          </v-col>

          <v-col cols="12" lg="4">
            <v-card variant="outlined" class="pa-4">
              <h3 class="text-h6 mb-4">Video Info</h3>

              <v-list density="compact" class="bg-transparent">
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="primary">mdi-file-video</v-icon>
                  </template>
                  <v-list-item-title>Filename</v-list-item-title>
                  <v-list-item-subtitle class="text-truncate">
                    {{ fileName }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="primary">mdi-timer</v-icon>
                  </template>
                  <v-list-item-title>Duration</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ formatDuration(videoStore.duration) }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="primary">mdi-aspect-ratio</v-icon>
                  </template>
                  <v-list-item-title>Resolution</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ videoStore.videoMetadata?.width }} x {{ videoStore.videoMetadata?.height }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="primary">mdi-speedometer</v-icon>
                  </template>
                  <v-list-item-title>Frame Rate</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ videoStore.fps }} fps
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>

              <v-divider class="my-4" />

              <v-btn
                variant="outlined"
                color="error"
                block
                @click="clearVideo"
              >
                <v-icon start>mdi-close</v-icon>
                Choose Different Video
              </v-btn>
            </v-card>
          </v-col>
        </v-row>

        <v-alert
          type="info"
          variant="tonal"
          density="compact"
          class="mt-4"
        >
          <strong>Tip:</strong> Use arrow keys or the frame navigation buttons to scrub through the video frame by frame.
          Press Space to play/pause.
        </v-alert>
      </div>
    </div>

    <!-- Navigation -->
    <div class="step-actions d-flex justify-end mt-6">
      <v-btn
        color="primary"
        size="large"
        :disabled="!videoStore.hasVideo"
        @click="emit('next')"
      >
        Continue to Trimming
        <v-icon end>mdi-arrow-right</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useVideoStore } from '../../stores/videoStore'
import { useClipsStore } from '../../stores/clipsStore'
import VideoPlayer from '../video/VideoPlayer.vue'

const emit = defineEmits<{
  next: []
}>()

const videoStore = useVideoStore()
const clipsStore = useClipsStore()

const isLoading = ref(false)

const fileName = computed(() => {
  if (!videoStore.videoPath) return ''
  return videoStore.videoPath.split(/[\\/]/).pop() || ''
})

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const selectVideo = async () => {
  isLoading.value = true
  try {
    const filePath = await window.electronAPI.selectVideo()
    if (filePath) {
      await videoStore.setVideo(filePath)
    }
  } catch (error) {
    console.error('Failed to select video:', error)
  } finally {
    isLoading.value = false
  }
}

const clearVideo = () => {
  videoStore.reset()
  clipsStore.reset()
}

const onVideoLoaded = (duration: number) => {
  // Initialize segments when video loads
  clipsStore.initializeSegments(duration)
}
</script>

<style scoped>
.step-upload {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.upload-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.upload-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-card {
  max-width: 500px;
  width: 100%;
  min-height: 300px;
  cursor: pointer;
  border-style: dashed;
  border-width: 2px;
  transition: all 0.2s ease;
}

.upload-card:hover {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.05);
}

.video-preview {
  flex: 1;
}

.step-actions {
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
