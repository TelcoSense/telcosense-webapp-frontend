<script setup lang="ts">
import { useActiveLayer } from '@/composables/useActiveLayer'
import { datetimeFormat } from '@/utils'
import { computed } from 'vue'

const { activeLayer } = useActiveLayer()

const disablePrev = computed(
  () => !activeLayer.value || activeLayer.value.currentIndex <= 0 || activeLayer.value.isPlaying,
)
const disableNext = computed(
  () =>
    !activeLayer.value ||
    activeLayer.value.currentIndex >= activeLayer.value.frames.length - 1 ||
    activeLayer.value.isPlaying,
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
  <div v-if="activeLayer" class="absolute bottom-6 w-96 rounded-md bg-gray-800 p-3 text-white">
    <div>
      <!-- <span v-if="activeLayer.frameLoading"> Loading...</span> -->
      First frame:
      <span class="font-chivo">
        {{ datetimeFormat(activeLayer.frames[0]?.timestamp, 'UTC') ?? '—' }}
      </span>
      <br />
      Last frame:
      <span class="font-chivo">
        {{
          datetimeFormat(activeLayer.frames[activeLayer.frames.length - 1]?.timestamp, 'UTC') ?? '—'
        }}
      </span>
      <br />
      Current frame:
      <span class="font-chivo">
        {{ datetimeFormat(activeLayer.frames[activeLayer.currentIndex]?.timestamp, 'UTC') ?? '—' }}
      </span>
    </div>

    <input
      v-if="activeLayer.frames.length"
      type="range"
      min="0"
      :max="activeLayer.frames.length - 1"
      :value="activeLayer.currentIndex"
      :disabled="activeLayer.isPlaying || activeLayer.frameLoading"
      @input="onSliderChange"
      class="w-full"
    />

    <div class="flex items-center gap-2 p-2">
      <button
        @click="activeLayer.changeFrame(-1)"
        :disabled="disablePrev"
        class="h-8 cursor-pointer rounded bg-gray-600 px-3 text-white hover:bg-gray-500 disabled:cursor-default disabled:opacity-40"
      >
        Prev
      </button>
      <button
        @click="activeLayer.changeFrame(1)"
        :disabled="disableNext"
        class="h-8 cursor-pointer rounded bg-gray-600 px-3 text-white hover:bg-gray-500 disabled:cursor-default disabled:opacity-40"
      >
        Next
      </button>
      <button
        @click="togglePlayback"
        class="h-8 cursor-pointer rounded bg-blue-600 px-3 text-white hover:bg-blue-500"
      >
        Play/Pause
      </button>
      <span class="font-chivo">
        {{ activeLayer.currentIndex + 1 }}/{{ activeLayer.frames.length }}
      </span>
    </div>
  </div>
</template>
