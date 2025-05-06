<script setup lang="ts">
import { useRadarStore } from '@/stores/radar'
import { computed } from 'vue'

const radar = useRadarStore()

const disablePrev = computed(() => radar.currentRadarIndex <= 0)
const disableNext = computed(() => radar.currentRadarIndex >= radar.frames.length - 1)

const currentFrameNumber = computed(() => radar.currentRadarIndex + 1)
const totalFrames = computed(() => radar.frames.length)
const currentTimestamp = computed(() => radar.frames[radar.currentRadarIndex]?.timestamp ?? '—')

function togglePlayback() {
  radar.toggleRadar()
}

function onSliderChange(event: Event) {
  const index = parseInt((event.target as HTMLInputElement).value)
  radar.showRadarFrame(index)
}
</script>

<template>
  <div
    class="absolute bottom-6 left-0 ml-72 flex flex-col items-start gap-3 bg-gray-800 p-2 text-white"
  >
    <!-- Frame Info -->
    <div class="font-mono text-sm">
      Frame {{ currentFrameNumber }} / {{ totalFrames }}<br />
      Timestamp: {{ currentTimestamp }}
    </div>

    <!-- Loading Spinner -->
    <div v-if="radar.frameLoading" class="text-sm text-yellow-400">Loading...</div>

    <!-- Slider -->
    <input
      v-if="radar.frames.length"
      type="range"
      min="0"
      :max="radar.frames.length - 1"
      :value="radar.currentRadarIndex"
      class="w-64"
      :disabled="radar.isPlaying || radar.frameLoading"
      @input="onSliderChange"
    />

    <!-- Controls -->
    <div class="flex gap-2">
      <button
        @click="radar.changeRadarFrame(-1)"
        :disabled="disablePrev || radar.frameLoading"
        class="rounded bg-white px-2 py-1 text-black"
      >
        Prev
      </button>

      <button
        @click="radar.changeRadarFrame(1)"
        :disabled="disableNext || radar.frameLoading"
        class="rounded bg-white px-2 py-1 text-black"
      >
        Next
      </button>

      <button
        @click="togglePlayback"
        :disabled="radar.frameLoading"
        class="rounded bg-white px-2 py-1 text-black"
      >
        {{ radar.isPlaying ? 'Pause' : 'Play' }}
      </button>
    </div>
  </div>
</template>
