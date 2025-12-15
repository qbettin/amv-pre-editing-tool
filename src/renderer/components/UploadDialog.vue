<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="500">
    <v-card>
      <v-card-title class="text-h5 font-weight-bold">
        <v-icon class="mr-2" color="primary">mdi-video-plus</v-icon>
        Add Video Clip
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="pa-6">
        <v-file-input
          v-model="file"
          label="Select Video File"
          accept="video/*"
          prepend-icon="mdi-movie"
          variant="outlined"
          :rules="[rules.required]"
          show-size
          class="mb-4"
        ></v-file-input>

        <v-text-field
          v-model="clipName"
          label="Clip Name"
          variant="outlined"
          prepend-icon="mdi-rename-box"
          hint="Leave empty to use filename"
          persistent-hint
        ></v-text-field>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn
          variant="text"
          @click="close"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :disabled="!file"
          @click="handleUpload"
        >
          <v-icon start>mdi-upload</v-icon>
          Add Clip
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  upload: [path: string, name: string]
}>()

const file = ref<File[] | null>(null)
const clipName = ref('')

const rules = {
  required: (value: any) => !!value || 'File is required'
}

watch(() => props.modelValue, (isOpen) => {
  if (!isOpen) {
    // Reset form when dialog closes
    file.value = null
    clipName.value = ''
  }
})

async function handleUpload() {
  if (!file.value || file.value.length === 0) return

  const selectedFile = file.value[0]
  
  // Get file path (Electron will handle this)
  const path = await window.electronAPI.selectVideo()
  
  if (path) {
    const name = clipName.value || selectedFile.name.replace(/\.[^/.]+$/, '')
    emit('upload', path, name)
    close()
  }
}

function close() {
  emit('update:modelValue', false)
}
</script>