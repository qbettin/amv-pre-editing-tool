<template>
  <div class="step-trimmer">
    <!-- Main Content Area -->
    <div class="trimmer-content">
      <!-- Video Player Section -->
      <div class="video-section">
        <v-card variant="outlined" class="video-card">
          <VideoPlayer
            ref="playerRef"
            :src="videoStore.videoPath"
            :fps="videoStore.fps"
            controls
            @timeupdate="onTimeUpdate"
          />
        </v-card>

        <!-- Toolbar -->
        <v-toolbar density="compact" class="mt-2 toolbar" rounded>
          <v-btn
            variant="text"
            @click="splitAtPlayhead"
            :disabled="!canSplit"
          >
            <v-icon start>mdi-content-cut</v-icon>
            Split Here
            <v-tooltip activator="parent" location="bottom">
              Split timeline at current position
            </v-tooltip>
          </v-btn>

          <v-divider vertical class="mx-2" />

          <v-btn
            variant="text"
            @click="addSelectedAsClip"
            :disabled="!hasSelectedSegments"
          >
            <v-icon start>mdi-plus</v-icon>
            Add as Clip
          </v-btn>

          <v-btn
            variant="text"
            @click="mergeSelected"
            :disabled="clipsStore.selectedSegmentIds.length < 2"
          >
            <v-icon start>mdi-merge</v-icon>
            Merge
          </v-btn>

          <v-spacer />

          <div class="time-display text-body-2 font-weight-medium">
            <v-icon size="16" class="mr-1">mdi-timer-outline</v-icon>
            {{ formatTimecode(videoStore.currentTime) }}
          </div>
        </v-toolbar>

        <!-- Timeline -->
        <v-card variant="outlined" class="mt-2">
          <Timeline
            :thumbnails="videoStore.timelineThumbnails"
            @seek="seekTo"
            @split="splitAtTime"
          />
        </v-card>

        <!-- Help Text -->
        <v-alert
          type="info"
          variant="tonal"
          density="compact"
          class="mt-3"
        >
          <div class="text-caption">
            <strong>Instructions:</strong>
            <ul class="mt-1 mb-0 pl-4">
              <li>Use the video controls or arrow keys to navigate</li>
              <li>Click "Split Here" to divide the timeline at the playhead</li>
              <li>Right-click segments to add/remove as clips</li>
              <li>Shift+Click for range selection, Ctrl+Click to toggle</li>
            </ul>
          </div>
        </v-alert>
      </div>
    </div>

    <!-- Clips Sidebar -->
    <ClipList @preview="previewClip" />

    <!-- Navigation -->
    <div class="step-actions">
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
        :disabled="!clipsStore.hasClips"
        @click="emit('next')"
      >
        Continue to Settings
        <v-icon end>mdi-arrow-right</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useVideoStore } from '../../stores/videoStore'
import { useClipsStore } from '../../stores/clipsStore'
import VideoPlayer from '../video/VideoPlayer.vue'
import Timeline from '../video/Timeline.vue'
import ClipList from '../clips/ClipList.vue'
import type { TrimmedClip } from '../../types'

const emit = defineEmits<{
  next: []
  back: []
}>()

const videoStore = useVideoStore()
const clipsStore = useClipsStore()

const playerRef = ref<InstanceType<typeof VideoPlayer> | null>(null)
const isLoadingThumbnails = ref(false)

// Computed
const canSplit = computed(() => {
  const time = videoStore.currentTime
  // Can split if not at the very start or end, and not on an existing split
  return time > 0.1 && time < videoStore.duration - 0.1
})

const hasSelectedSegments = computed(() => {
  return clipsStore.selectedSegmentIds.length > 0
})

// Methods
const formatTimecode = (time: number): string => {
  const totalSeconds = Math.floor(time)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const frames = Math.floor((time - totalSeconds) * videoStore.fps)

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
}

const onTimeUpdate = (time: number) => {
  videoStore.setCurrentTime(time)
}

const seekTo = (time: number) => {
  if (playerRef.value) {
    playerRef.value.seek(time)
  }
  videoStore.setCurrentTime(time)
}

const splitAtPlayhead = () => {
  splitAtTime(videoStore.currentTime)
}

const splitAtTime = (time: number) => {
  clipsStore.splitAtTime(time)
}

const addSelectedAsClip = async () => {
  for (const segmentId of clipsStore.selectedSegmentIds) {
    if (!clipsStore.segmentHasClip(segmentId)) {
      const segment = clipsStore.segments.find(s => s.id === segmentId)
      if (segment) {
        const thumbnailTime = segment.startTime + (segment.endTime - segment.startTime) / 2
        let thumbnail: string | undefined

        try {
          thumbnail = await window.electronAPI.extractThumbnail(videoStore.videoPath, thumbnailTime)
        } catch (error) {
          console.error('Failed to extract thumbnail:', error)
        }

        await clipsStore.addSegmentAsClip(segmentId, thumbnail)
      }
    }
  }
}

const mergeSelected = () => {
  clipsStore.mergeSelectedSegments()
}

const previewClip = (clip: TrimmedClip) => {
  seekTo(clip.startTime)
}

// Load timeline thumbnails on mount
onMounted(async () => {
  if (videoStore.timelineThumbnails.length === 0) {
    isLoadingThumbnails.value = true
    try {
      await videoStore.loadTimelineThumbnails(20)
    } catch (error) {
      console.error('Failed to load thumbnails:', error)
    } finally {
      isLoadingThumbnails.value = false
    }
  }
})
</script>

<style scoped>
.step-trimmer {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  padding-right: 280px; /* Space for sidebar */
}

.trimmer-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.video-section {
  max-width: 1000px;
}

.video-card {
  background: #000;
}

.toolbar {
  background: rgb(var(--v-theme-surface-variant));
}

.time-display {
  font-family: monospace;
  color: rgb(var(--v-theme-primary));
}

.step-actions {
  display: flex;
  padding: 16px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
}
</style>
