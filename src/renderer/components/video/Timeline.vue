<template>
  <div class="timeline-container">
    <!-- Thumbnails Strip -->
    <div class="timeline-thumbnails" ref="timelineRef">
      <div
        v-for="(thumb, index) in thumbnails"
        :key="index"
        class="thumbnail"
        :style="{ backgroundImage: `url(${thumb})` }"
      />
    </div>

    <!-- Segments Layer -->
    <div class="timeline-segments">
      <div
        v-for="segment in segments"
        :key="segment.id"
        class="segment"
        :class="{
          'segment--selected': isSegmentSelected(segment.id),
          'segment--has-clip': hasClip(segment.id)
        }"
        :style="getSegmentStyle(segment)"
        @click.stop="handleSegmentClick($event, segment)"
        @contextmenu.prevent="showContextMenu($event, segment)"
      >
        <div class="segment-label" v-if="hasClip(segment.id)">
          {{ getClipName(segment.id) }}
        </div>
      </div>

      <!-- Segment borders -->
      <div
        v-for="segment in segments.slice(1)"
        :key="`border-${segment.id}`"
        class="segment-border"
        :style="{ left: `${(segment.startTime / duration) * 100}%` }"
      />
    </div>

    <!-- Playhead -->
    <div
      class="playhead"
      :style="{ left: `${playheadPosition}%` }"
    >
      <div class="playhead-head" />
      <div class="playhead-line" />
    </div>

    <!-- Clickable track for seeking -->
    <div
      class="timeline-track"
      @click="handleTrackClick"
      @mousedown="startDragging"
    />

    <!-- Context Menu -->
    <v-menu
      v-model="contextMenu.show"
      :target="contextMenu.target"
      location="top"
      :close-on-content-click="true"
    >
      <v-list density="compact" class="py-0">
        <v-list-item
          v-if="!hasClip(contextMenu.segmentId)"
          @click="addAsClip"
          prepend-icon="mdi-plus"
        >
          <v-list-item-title>Add as Clip</v-list-item-title>
        </v-list-item>

        <v-list-item
          v-else
          @click="removeClip"
          prepend-icon="mdi-minus"
        >
          <v-list-item-title>Remove Clip</v-list-item-title>
        </v-list-item>

        <v-divider v-if="selectedSegmentIds.length >= 2" />

        <v-list-item
          v-if="selectedSegmentIds.length >= 2"
          @click="mergeSegments"
          prepend-icon="mdi-merge"
        >
          <v-list-item-title>Merge Selected</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>

    <!-- Time markers -->
    <div class="time-markers">
      <span
        v-for="marker in timeMarkers"
        :key="marker.time"
        class="time-marker"
        :style="{ left: `${marker.position}%` }"
      >
        {{ marker.label }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useVideoStore } from '../../stores/videoStore'
import { useClipsStore } from '../../stores/clipsStore'
import type { TimelineSegment } from '../../types'

const props = defineProps<{
  thumbnails: string[]
}>()

const emit = defineEmits<{
  seek: [time: number]
  split: [time: number]
}>()

const videoStore = useVideoStore()
const clipsStore = useClipsStore()

const timelineRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)

// Context menu state
const contextMenu = ref({
  show: false,
  target: [0, 0] as [number, number],
  segmentId: ''
})

// Computed
const segments = computed(() => clipsStore.segments)
const selectedSegmentIds = computed(() => clipsStore.selectedSegmentIds)
const duration = computed(() => videoStore.duration)

const playheadPosition = computed(() => {
  if (duration.value === 0) return 0
  return (videoStore.currentTime / duration.value) * 100
})

const timeMarkers = computed(() => {
  const markers: { time: number; position: number; label: string }[] = []
  const step = Math.max(5, Math.ceil(duration.value / 10)) // At least every 5 seconds

  for (let t = 0; t <= duration.value; t += step) {
    const mins = Math.floor(t / 60)
    const secs = Math.floor(t % 60)
    markers.push({
      time: t,
      position: (t / duration.value) * 100,
      label: `${mins}:${secs.toString().padStart(2, '0')}`
    })
  }

  return markers
})

// Methods
const getSegmentStyle = (segment: TimelineSegment) => {
  const left = (segment.startTime / duration.value) * 100
  const width = ((segment.endTime - segment.startTime) / duration.value) * 100
  return {
    left: `${left}%`,
    width: `${width}%`
  }
}

const isSegmentSelected = (segmentId: string) => {
  return selectedSegmentIds.value.includes(segmentId)
}

const hasClip = (segmentId: string) => {
  return clipsStore.segmentHasClip(segmentId)
}

const getClipName = (segmentId: string) => {
  const clip = clipsStore.getClipBySegmentId(segmentId)
  return clip?.name || ''
}

const handleTrackClick = (event: MouseEvent) => {
  if (!timelineRef.value) return

  const rect = timelineRef.value.getBoundingClientRect()
  const position = (event.clientX - rect.left) / rect.width
  const time = position * duration.value

  emit('seek', time)
}

const startDragging = (_event: MouseEvent) => {
  isDragging.value = true

  const handleMove = (e: MouseEvent) => {
    if (!isDragging.value || !timelineRef.value) return

    const rect = timelineRef.value.getBoundingClientRect()
    const position = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const time = position * duration.value

    emit('seek', time)
  }

  const handleUp = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', handleUp)
  }

  document.addEventListener('mousemove', handleMove)
  document.addEventListener('mouseup', handleUp)
}

const handleSegmentClick = (event: MouseEvent, segment: TimelineSegment) => {
  let mode: 'single' | 'toggle' | 'range' = 'single'

  if (event.ctrlKey || event.metaKey) {
    mode = 'toggle'
  } else if (event.shiftKey) {
    mode = 'range'
  }

  clipsStore.selectSegment(segment.id, mode)
}

const showContextMenu = (event: MouseEvent, segment: TimelineSegment) => {
  // Select the segment if not already selected
  if (!isSegmentSelected(segment.id)) {
    clipsStore.selectSegment(segment.id, 'single')
  }

  contextMenu.value = {
    show: true,
    target: [event.clientX, event.clientY],
    segmentId: segment.id
  }
}

const addAsClip = async () => {
  if (!contextMenu.value.segmentId) return

  // Extract thumbnail for the clip
  const segment = segments.value.find(s => s.id === contextMenu.value.segmentId)
  if (!segment) return

  const thumbnailTime = segment.startTime + (segment.endTime - segment.startTime) / 2
  let thumbnail: string | undefined

  try {
    thumbnail = await window.electronAPI.extractThumbnail(videoStore.videoPath, thumbnailTime)
  } catch (error) {
    console.error('Failed to extract thumbnail:', error)
  }

  clipsStore.addSegmentAsClip(contextMenu.value.segmentId, thumbnail)
  contextMenu.value.show = false
}

const removeClip = () => {
  if (!contextMenu.value.segmentId) return
  clipsStore.removeClipBySegmentId(contextMenu.value.segmentId)
  contextMenu.value.show = false
}

const mergeSegments = () => {
  clipsStore.mergeSelectedSegments()
  contextMenu.value.show = false
}
</script>

<style scoped>
.timeline-container {
  position: relative;
  height: 120px;
  background: rgb(var(--v-theme-surface-variant));
  border-radius: 8px;
  overflow: hidden;
}

.timeline-thumbnails {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 80px;
  display: flex;
  overflow: hidden;
}

.thumbnail {
  flex: 1;
  background-size: cover;
  background-position: center;
  opacity: 0.6;
}

.timeline-segments {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 80px;
  pointer-events: auto;
  z-index: 6;
}

.segment {
  position: absolute;
  top: 0;
  height: 100%;
  border: 2px solid transparent;
  border-radius: 4px;
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: flex-end;
  padding: 4px;
}

.segment:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
  background: rgba(var(--v-theme-primary), 0.1);
}

.segment--selected {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.2);
}

.segment--has-clip {
  background: rgba(var(--v-theme-success), 0.3);
  border-color: rgb(var(--v-theme-success));
}

.segment--has-clip.segment--selected {
  background: rgba(var(--v-theme-success), 0.4);
}

.segment-label {
  font-size: 10px;
  color: white;
  background: rgba(0, 0, 0, 0.7);
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.segment-border {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background: rgb(var(--v-theme-primary));
  transform: translateX(-1px);
  pointer-events: none;
}

.playhead {
  position: absolute;
  top: 0;
  height: 80px;
  width: 2px;
  pointer-events: none;
  z-index: 10;
  transform: translateX(-1px);
}

.playhead-head {
  width: 12px;
  height: 12px;
  background: rgb(var(--v-theme-error));
  transform: translateX(-5px);
  clip-path: polygon(50% 100%, 0 0, 100% 0);
}

.playhead-line {
  width: 2px;
  height: calc(100% - 12px);
  background: rgb(var(--v-theme-error));
}

.timeline-track {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 80px;
  cursor: pointer;
  z-index: 1;
}

.time-markers {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 4px;
}

.time-marker {
  position: absolute;
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface-variant));
  transform: translateX(-50%);
  white-space: nowrap;
}
</style>
