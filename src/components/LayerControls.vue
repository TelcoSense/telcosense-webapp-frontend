<script setup lang="ts">
import { useActiveLayer } from '@/composables/useActiveLayer'
import { computed } from 'vue'

const { activeLayer } = useActiveLayer()

const disablePrev = computed(() => !activeLayer.value || activeLayer.value.currentIndex <= 0)
const disableNext = computed(
  () => !activeLayer.value || activeLayer.value.currentIndex >= activeLayer.value.frames.length - 1,
)

function togglePlayback() {
  activeLayer.value?.toggle()
}

function onSliderChange(event: Event) {
  const index = parseInt((event.target as HTMLInputElement).value)
  activeLayer.value?.showFrame(index)
}
</script>

<template>
  <div v-if="activeLayer" class="absolute bottom-6 left-0 ml-72 bg-gray-800 p-2 text-white">
    <div class="font-mono text-sm">
      Frame {{ activeLayer.currentIndex + 1 }} / {{ activeLayer.frames.length }}<br />
      Timestamp: {{ activeLayer.frames[activeLayer.currentIndex]?.timestamp ?? '—' }}
    </div>

    <div v-if="activeLayer.frameLoading" class="text-yellow-400">Loading...</div>

    <input
      v-if="activeLayer.frames.length"
      type="range"
      min="0"
      :max="activeLayer.frames.length - 1"
      :value="activeLayer.currentIndex"
      :disabled="activeLayer.isPlaying || activeLayer.frameLoading"
      @input="onSliderChange"
      class="w-64"
    />

    <div class="mt-2 flex gap-2">
      <button @click="activeLayer.changeFrame(-1)" :disabled="disablePrev">Prev</button>
      <button @click="activeLayer.changeFrame(1)" :disabled="disableNext">Next</button>
      <button @click="togglePlayback">{{ activeLayer.isPlaying ? 'Pause' : 'Play' }}</button>
    </div>
  </div>
</template>
