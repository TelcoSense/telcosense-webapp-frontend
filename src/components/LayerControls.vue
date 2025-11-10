<script setup lang="ts">
import { useActiveLayer } from '@/composables/useActiveLayer'
import { useConfigStore } from '@/stores/config'
import { datetimeFormat } from '@/utils'
import { computed, ref, watch } from 'vue'

const { activeLayer } = useActiveLayer()
const config = useConfigStore()

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
  <div v-if="activeLayer && config.layerControlsVisible"
    class="absolute bottom-3 w-[calc(100%-1.5rem)] max-w-[380px] rounded-md border border-gray-600 bg-gray-800/60 p-2 text-xs text-white backdrop-blur-xs md:text-sm">
    <div class="flex items-center justify-center gap-x-3">
      <button @click="activeLayer.changeFrame(-1)" :disabled="disablePrev"
        class="h-6 cursor-pointer rounded bg-gray-600 px-3 text-white hover:bg-gray-500 disabled:cursor-default disabled:opacity-40 md:h-8">
        Prev
      </button>
      <button @click="activeLayer.changeFrame(1)" :disabled="disableNext"
        class="h-6 cursor-pointer rounded bg-gray-600 px-3 text-white hover:bg-gray-500 disabled:cursor-default disabled:opacity-40 md:h-8">
        Next
      </button>
      <button @click="togglePlayback"
        class="h-6 cursor-pointer rounded bg-blue-600 px-3 text-white hover:bg-blue-500 md:h-8">
        Play/Pause
      </button>
    </div>
    <p class="mt-1">
      Current frame:
      <span class="font-chivo">
        {{
          datetimeFormat(activeLayer.frames[sliderIndex]?.timestamp, config.datetimeFormat) ?? '—'
        }}
      </span>
      <span class="font-chivo">&nbsp;{{ sliderLabel }} </span>
    </p>
    <div class="flex flex-col items-center gap-x-3">
      <input v-if="activeLayer.frames.length" type="range" min="0" :max="activeLayer.frames.length - 1"
        v-model.number="sliderIndex" @change="onSliderChanged"
        :disabled="activeLayer.isPlaying || activeLayer.frameLoading" :key="activeLayer.name" class="w-full" />
      <div class="flex w-full justify-between">
        <span class="font-chivo text-nowrap">
          {{ datetimeFormat(activeLayer.frames[0]?.timestamp, config.datetimeFormat) ?? '—' }}
        </span>
        <span class="font-chivo text-nowrap">
          {{
            datetimeFormat(
              activeLayer.frames[activeLayer.frames.length - 1]?.timestamp,
              config.datetimeFormat,
            ) ?? '—'
          }}
        </span>
      </div>
    </div>

    <div class="flex items-center justify-between gap-x-1">
      <div class="flex items-center gap-x-1">
        <span>Opacity:</span>
        <input type="range" min="0" max="1" step="0.01" :value="activeLayer.opacity"
          @input="(e) => activeLayer?.setOpacity(parseFloat((e.target as HTMLInputElement).value))"
          class="w-14 md:w-20" />
      </div>
      <div class="flex items-center gap-x-1">
        <span>Speed:</span>
        <input type="range" min="0.1" max="10" step="0.1" :value="1000 / activeLayer.animationSpeed" @input="
          (e) => {
            const fps = parseFloat((e.target as HTMLInputElement).value)
            activeLayer?.setAnimationSpeed(1000 / fps)
          }
        " class="w-14 md:w-20" />
        <span class="font-chivo">{{ (1000 / activeLayer.animationSpeed).toFixed(1) }} fps</span>
      </div>
    </div>
  </div>
  <div v-else-if="activeLayer && !config.layerControlsVisible"
    class="absolute bottom-3 rounded-md border border-gray-600 bg-gray-800/60 p-2 text-xs text-white backdrop-blur-xs md:text-sm">
    Current frame:
    <span class="font-chivo">
      {{ datetimeFormat(activeLayer.frames[sliderIndex]?.timestamp, config.datetimeFormat) ?? '—' }}
    </span>
  </div>
</template>
