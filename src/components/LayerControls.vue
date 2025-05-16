<script setup lang="ts">
import { useActiveLayer } from '@/composables/useActiveLayer'
import { datetimeFormat } from '@/utils'
import { computed, ref, watch } from 'vue'

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

function onSliderChanged(event: Event) {
  const index = parseInt((event.target as HTMLInputElement).value)
  activeLayer.value?.showFrame(index)
}

const sliderIndex = ref(0)

watch(
  () => activeLayer.value?.currentIndex,
  (index) => {
    if (index != null) sliderIndex.value = index
  },
)

const sliderLabel = computed(() =>
  activeLayer.value && activeLayer.value.frames.length
    ? `${sliderIndex.value + 1}/${activeLayer.value.frames.length}`
    : '—',
)
</script>

<template>
  <div v-if="activeLayer" class="absolute bottom-6 rounded-md bg-gray-800 p-3 text-sm text-white">
    <div class="flex items-center gap-x-3 pb-2">
      <span class="font-chivo text-nowrap">
        {{ datetimeFormat(activeLayer.frames[0]?.timestamp, 'UTC') ?? '—' }}
      </span>
      <input
        v-if="activeLayer.frames.length"
        type="range"
        min="0"
        :max="activeLayer.frames.length - 1"
        v-model.number="sliderIndex"
        @change="onSliderChanged"
        :disabled="activeLayer.isPlaying || activeLayer.frameLoading"
        class="w-[480px]"
      />
      <span class="font-chivo text-nowrap">
        {{
          datetimeFormat(activeLayer.frames[activeLayer.frames.length - 1]?.timestamp, 'UTC') ?? '—'
        }}
      </span>
    </div>

    <div class="flex items-center gap-x-3">
      <span>Opacity:</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="activeLayer.opacity"
        @input="(e) => activeLayer?.setOpacity(parseFloat((e.target as HTMLInputElement).value))"
        class="w-20"
      />
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

      <p>
        Current frame:
        <span class="font-chivo">
          {{ datetimeFormat(activeLayer.frames[sliderIndex]?.timestamp, 'UTC') ?? '—' }}
        </span>
        <span class="font-chivo">&nbsp;{{ sliderLabel }} </span>
      </p>
    </div>
  </div>
</template>
