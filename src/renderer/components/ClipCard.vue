<template>
  <v-card class="clip-card" elevation="2">
    <v-card-title class="d-flex justify-space-between align-center">
      <div class="text-truncate">{{ clip.name }}</div>
      <v-chip
        :color="statusColor"
        size="small"
        variant="flat"
      >
        {{ clip.status }}
      </v-chip>
    </v-card-title>

    <v-card-text>
      <div class="text-body-2 text-medium-emphasis mb-2">
        {{ clip.path }}
      </div>

      <v-divider class="my-2" />

      <div class="settings-grid">
        <div>
          <strong>Mode:</strong> {{ clip.settings.mode }}
        </div>
        <div>
          <strong>Threshold:</strong> {{ clip.settings.threshold }}
        </div>
        <div>
          <strong>Min Frames:</strong> {{ clip.settings.minFrames }}
        </div>
      </div>

      <v-progress-linear
        v-if="clip.status === 'processing'"
        :model-value="progress"
        color="primary"
        class="mt-3"
      >
        <template #default="{ value }">
          <strong>{{ Math.ceil(value) }}%</strong>
        </template>
      </v-progress-linear>
    </v-card-text>

    <v-card-actions>
      <v-btn
        v-if="clip.status === 'pending'"
        @click="$emit('process', clip)"
        color="primary"
        variant="tonal"
      >
        Process
      </v-btn>

      <v-btn
        v-if="clip.status === 'completed'"
        @click="openOutputFolder"
        color="success"
        variant="tonal"
      >
        Open Output
      </v-btn>

      <v-spacer />

      <v-btn
        @click="$emit('remove', clip)"
        color="error"
        variant="text"
        icon="mdi-delete"
      />
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Clip } from '../types'

interface Props {
  clip: Clip
  progress?: number
}

const props = withDefaults(defineProps<Props>(), {
  progress: 0
})

defineEmits<{
  process: [clip: Clip]
  remove: [clip: Clip]
}>()

const statusColor = computed(() => {
  switch (props.clip.status) {
    case 'pending': return 'grey'
    case 'processing': return 'primary'
    case 'completed': return 'success'
    case 'error': return 'error'
    default: return 'grey'
  }
})

const openOutputFolder = () => {
  // This would typically use an electron API to open the folder
  console.log('Opening output folder for:', props.clip.name)
}
</script>

<style scoped>
.clip-card {
  margin-bottom: 16px;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  font-size: 0.875rem;
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>