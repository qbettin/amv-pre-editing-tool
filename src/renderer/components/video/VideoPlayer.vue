<template>
  <div class="video-player" :class="{ 'video-player--mini': size === 'mini' }">
    <div class="video-container">
      <video
        ref="videoRef"
        :src="videoSrc"
        @loadedmetadata="onLoadedMetadata"
        @timeupdate="onTimeUpdate"
        @play="onPlay"
        @pause="onPause"
        @ended="onEnded"
        :muted="muted"
      />
      <div v-if="!videoSrc" class="video-placeholder">
        <v-icon size="64" color="grey-darken-1">mdi-video-off</v-icon>
        <span class="text-grey-darken-1 mt-2">No video loaded</span>
      </div>
    </div>

    <div v-if="controls && videoSrc" class="video-controls">
      <div class="controls-row">
        <v-btn
          icon
          size="small"
          variant="text"
          @click="stepBackward"
          :disabled="!canStepBackward"
        >
          <v-icon>mdi-skip-previous</v-icon>
          <v-tooltip activator="parent" location="top">Previous Frame</v-tooltip>
        </v-btn>

        <v-btn
          icon
          size="small"
          variant="text"
          @click="togglePlay"
        >
          <v-icon>{{ isPlaying ? 'mdi-pause' : 'mdi-play' }}</v-icon>
          <v-tooltip activator="parent" location="top">
            {{ isPlaying ? 'Pause' : 'Play' }}
          </v-tooltip>
        </v-btn>

        <v-btn
          icon
          size="small"
          variant="text"
          @click="stepForward"
          :disabled="!canStepForward"
        >
          <v-icon>mdi-skip-next</v-icon>
          <v-tooltip activator="parent" location="top">Next Frame</v-tooltip>
        </v-btn>

        <div class="time-display">
          <span class="current-time">{{ formatTimecode(currentTime) }}</span>
          <span class="separator"> / </span>
          <span class="duration">{{ formatTimecode(videoDuration) }}</span>
        </div>
      </div>

      <v-slider
        v-if="showSeekbar"
        v-model="sliderTime"
        :max="videoDuration"
        :step="0.001"
        hide-details
        density="compact"
        color="primary"
        track-color="grey-darken-2"
        class="seek-slider"
        @update:model-value="seek"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

interface Props {
  src?: string
  controls?: boolean
  startTime?: number
  endTime?: number
  size?: 'normal' | 'mini'
  fps?: number
  showSeekbar?: boolean
  muted?: boolean
  autoplay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  controls: true,
  startTime: 0,
  endTime: undefined,
  size: 'normal',
  fps: 30,
  showSeekbar: true,
  muted: false,
  autoplay: false
})

const emit = defineEmits<{
  timeupdate: [time: number]
  loadedmetadata: [duration: number]
  play: []
  pause: []
  ended: []
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const currentTime = ref(0)
const videoDuration = ref(0)
const isPlaying = ref(false)
const sliderTime = ref(0)

// Compute video source with time fragment if start/end specified
const videoSrc = computed(() => {
  if (!props.src) return ''
  if (props.startTime || props.endTime) {
    const start = props.startTime || 0
    const end = props.endTime ? `${props.endTime}` : ''
    return `${props.src}#t=${start}${end ? ',' + end : ''}`
  }
  return props.src
})

const frameDuration = computed(() => 1 / props.fps)
const canStepBackward = computed(() => currentTime.value > 0)
const canStepForward = computed(() => currentTime.value < videoDuration.value)

// Format time as MM:SS:FF (frames)
const formatTimecode = (time: number): string => {
  const totalSeconds = Math.floor(time)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const frames = Math.floor((time - totalSeconds) * props.fps)

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
}

// Video control methods
const togglePlay = () => {
  if (!videoRef.value) return

  if (isPlaying.value) {
    videoRef.value.pause()
  } else {
    videoRef.value.play()
  }
}

const play = () => {
  videoRef.value?.play()
}

const pause = () => {
  videoRef.value?.pause()
}

const seek = (time: number) => {
  if (!videoRef.value) return
  videoRef.value.currentTime = time
  currentTime.value = time
}

const stepForward = () => {
  if (!videoRef.value) return
  const newTime = Math.min(currentTime.value + frameDuration.value, videoDuration.value)
  seek(newTime)
}

const stepBackward = () => {
  if (!videoRef.value) return
  const newTime = Math.max(currentTime.value - frameDuration.value, 0)
  seek(newTime)
}

// Event handlers
const onLoadedMetadata = () => {
  if (!videoRef.value) return
  videoDuration.value = videoRef.value.duration
  emit('loadedmetadata', videoDuration.value)

  if (props.startTime > 0) {
    videoRef.value.currentTime = props.startTime
  }

  if (props.autoplay) {
    videoRef.value.play()
  }
}

const onTimeUpdate = () => {
  if (!videoRef.value) return
  currentTime.value = videoRef.value.currentTime
  sliderTime.value = currentTime.value
  emit('timeupdate', currentTime.value)

  // Handle end time constraint
  if (props.endTime && currentTime.value >= props.endTime) {
    videoRef.value.pause()
    videoRef.value.currentTime = props.endTime
  }
}

const onPlay = () => {
  isPlaying.value = true
  emit('play')
}

const onPause = () => {
  isPlaying.value = false
  emit('pause')
}

const onEnded = () => {
  isPlaying.value = false
  emit('ended')
}

// Watch for external time changes
watch(() => props.startTime, (newTime) => {
  if (videoRef.value && newTime !== undefined) {
    videoRef.value.currentTime = newTime
  }
})

// Keyboard shortcuts
const handleKeydown = (e: KeyboardEvent) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

  switch (e.key) {
    case ' ':
      e.preventDefault()
      togglePlay()
      break
    case 'ArrowLeft':
      e.preventDefault()
      stepBackward()
      break
    case 'ArrowRight':
      e.preventDefault()
      stepForward()
      break
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// Expose methods for parent components
defineExpose({
  play,
  pause,
  seek,
  stepForward,
  stepBackward,
  getCurrentTime: () => currentTime.value,
  getDuration: () => videoDuration.value,
  isPlaying: () => isPlaying.value
})
</script>

<style scoped>
.video-player {
  display: flex;
  flex-direction: column;
  background: rgb(var(--v-theme-surface));
  border-radius: 8px;
  overflow: hidden;
}

.video-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-container video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.video-controls {
  padding: 8px 12px;
  background: rgb(var(--v-theme-surface-variant));
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.time-display {
  margin-left: auto;
  font-family: monospace;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
}

.current-time {
  color: rgb(var(--v-theme-primary));
}

.separator {
  color: rgb(var(--v-theme-on-surface-variant));
}

.seek-slider {
  margin-top: 4px;
}

/* Mini size variant */
.video-player--mini .video-container {
  max-height: 180px;
}

.video-player--mini .video-controls {
  padding: 4px 8px;
}

.video-player--mini .time-display {
  font-size: 12px;
}

.video-player--mini .controls-row {
  gap: 2px;
}
</style>
