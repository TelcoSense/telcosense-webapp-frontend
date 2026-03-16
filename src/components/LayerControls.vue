<script setup lang="ts">
import { useActiveLayer } from '@/composables/useActiveLayer'
import { useConfigStore } from '@/stores/config'
import { useDeviceStore } from '@/stores/device'
import { datetimeFormat } from '@/utils'
import { computed, ref, watch } from 'vue'

import { Icon } from '@iconify/vue'

const props = withDefaults(
  defineProps<{
    mapTarget?: 'main' | 'secondary'
  }>(),
  {
    mapTarget: 'main',
  },
)

const { activeLayerMain, activeLayerSecondary } = useActiveLayer()

function setOpacityMain(e: Event) {
  const v = parseFloat((e.target as HTMLInputElement).value)
  activeLayerMain.value?.setOpacity(v)

  // sync secondary ONLY when locked
  if (useConfigStore().followPrimary) {
    activeLayerSecondary.value?.setOpacity(v)
  }
}

function setOpacitySecondary(e: Event) {
  const v = parseFloat((e.target as HTMLInputElement).value)
  activeLayerSecondary.value?.setOpacity(v)
}

function findClosestFrameIndex(frames: { timestamp: string }[], targetTs: number) {
  let bestIdx = 0
  let bestDiff = Infinity
  for (let i = 0; i < frames.length; i++) {
    const diff = Math.abs(new Date(frames[i].timestamp).getTime() - targetTs)
    if (diff < bestDiff) {
      bestDiff = diff
      bestIdx = i
    }
  }
  return bestIdx
}

const activeLayer = computed(() =>
  props.mapTarget === 'secondary' ? activeLayerSecondary.value : activeLayerMain.value,
)

const config = useConfigStore()
const device = useDeviceStore()

const rainColors = [
  '#380070',
  '#3000a8',
  '#0000fc',
  '#006cc0',
  '#00a000',
  '#00bc00',
  '#34d800',
  '#9cdc00',
  '#e0dc00',
  '#fcb000',
  '#fc8400',
  '#fc5800',
  '#fc0000',
  '#a00000',
  '#fcfcfc',
]

type TempStop = { t: number; color: string }

const tempStops: TempStop[] = [
  { t: -50, color: '#a301e3' },
  { t: -30, color: '#8100e8' },
  { t: -20, color: '#6101e7' },
  { t: -15, color: '#4001e4' },
  { t: -10, color: '#0525e4' },
  { t: -8, color: '#0446ea' },
  { t: -6, color: '#0367e7' },
  { t: -4, color: '#0788e7' },
  { t: -3, color: '#07a9e8' },
  { t: -2, color: '#04cbe8' },
  { t: -1, color: '#08e7e3' },
  { t: 0, color: '#07e9c4' },
  { t: 1, color: '#04eaa2' },
  { t: 2, color: '#0ae964' },
  { t: 3, color: '#6eec0e' },
  { t: 4, color: '#b0ec0c' },
  { t: 5, color: '#ceec11' },
  { t: 8, color: '#ebe80e' },
  { t: 10, color: '#ebc90d' },
  { t: 12, color: '#eca912' },
  { t: 14, color: '#ed8b11' },
  { t: 16, color: '#ed6b13' },
  { t: 18, color: '#f04b15' },
  { t: 30, color: '#f22c0f' },
  { t: 35, color: '#f01438' },
  { t: 50, color: '#ff0000' },
]

function colorFromTemp(temp: number | null | undefined): string {
  if (temp == null || Number.isNaN(temp)) return 'rgba(0,0,0,0)'

  if (temp <= tempStops[0].t) return tempStops[0].color
  if (temp >= tempStops[tempStops.length - 1].t) return tempStops[tempStops.length - 1].color

  for (let i = tempStops.length - 1; i >= 0; i--) {
    if (temp >= tempStops[i].t) return tempStops[i].color
  }
  return tempStops[0].color
}

const isTemperatureLayer = computed(() => {
  const id = activeLayer.value?.id
  return id === 'tempcz' || id === 'tempchmi'
})

const isFollowingPrimaryOnSecondary = computed(() => {
  return props.mapTarget === 'secondary' && config.followPrimary
})

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

watch(
  () => activeLayerMain.value?.currentTimestamp ?? null,
  async (ts) => {
    if (props.mapTarget !== 'main') return
    if (!ts) return

    const secondary = activeLayerSecondary.value
    if (!secondary || secondary.isPlaying) return
    if (!secondary.frames.length) return
    if (!config.followPrimary) return

    const now = new Date()
    if (config.layerSwitchedTime && now.getTime() - config.layerSwitchedTime.getTime() < 100) {
      return
    }

    const targetTs = +new Date(ts)
    const idx = findClosestFrameIndex(secondary.frames, targetTs)

    if (idx !== secondary.currentIndex) {
      secondary.showFrame(idx)
    }
  },
  { flush: 'post' },
)

const sliderLabel = computed(() =>
  activeLayer.value && activeLayer.value.frames.length
    ? `${sliderIndex.value + 1}/${activeLayer.value.frames.length}`
    : '—',
)

const frameColors = computed(() => {
  if (!activeLayer.value) return []

  return activeLayer.value.frames.map((frame) => {
    const v = frame.rain_score
    if (v == null) return 'rgba(0,0,0,0)'

    if (isTemperatureLayer.value) {
      // here rain_score actually means “median temperature”
      return colorFromTemp(v)
    }

    // normal rain layer behavior
    const idx = Math.floor(v * rainColors.length)
    return rainColors[Math.min(rainColors.length - 1, Math.max(0, idx))]
  })
})

const sliderGradient = computed(() => {
  const colors = frameColors.value
  const n = colors.length

  const base = 'linear-gradient(to right, #4b5563 0%, #4b5563 100%)' // gray-600
  if (!n) return base

  const overlay = `linear-gradient(to right, ${colors
    .map((c, i) => {
      const a = (i / n) * 100
      const b = ((i + 1) / n) * 100
      // keep transparent segments transparent; they'll reveal the base gray layer
      return `${c} ${a}% ${b}%`
    })
    .join(', ')})`

  // overlay on top of gray base
  return `${overlay}, ${base}`
})
</script>

<template>
  <div v-if="
    activeLayer &&
    config.layerControlsVisible &&
    (!device.isMobile || !config.dataPlottingVisible)
  "
    class="absolute bottom-3 w-[calc(100%-1.5rem)] max-w-[380px] rounded-md border border-gray-600 blurred-bg p-2 text-xs text-white md:text-sm">
    <div class="flex items-center justify-between gap-x-3">
      <span> Layer: {{ activeLayer.name }}</span>

      <div v-if="!(props.mapTarget === 'secondary' && config.followPrimary)" class="flex gap-x-2">
        <button @click="activeLayer.changeFrame(-1)" :disabled="disablePrev"
          class="flex h-6 w-8 items-center justify-center cursor-pointer rounded-md bg-gray-600 text-white hover:bg-gray-700 disabled:cursor-default disabled:opacity-50 md:h-8 md:w-10"
          aria-label="Previous frame" title="Previous frame">
          <Icon icon="material-symbols:skip-previous-rounded" width="22" height="22" />
        </button>
        <button @click="activeLayer.changeFrame(1)" :disabled="disableNext"
          class="flex h-6 w-8 items-center justify-center cursor-pointer rounded-md bg-gray-600 text-white hover:bg-gray-700 disabled:cursor-default disabled:opacity-50 md:h-8 md:w-10"
          aria-label="Next frame" title="Next frame">
          <Icon icon="material-symbols:skip-next-rounded" width="22" height="22" />
        </button>
        <button @click="togglePlayback"
          class="flex h-6 w-8 items-center justify-center cursor-pointer rounded-md bg-blue-600 text-white hover:bg-blue-700 md:h-8 md:w-10"
          :aria-label="activeLayer.isPlaying ? 'Pause playback' : 'Play playback'"
          :title="activeLayer.isPlaying ? 'Pause playback' : 'Play playback'">
          <Icon :icon="activeLayer.isPlaying
            ? 'material-symbols:pause-rounded'
            : 'material-symbols:play-arrow-rounded'" width="22" height="22" />
        </button>
      </div>
      <div v-else>
        <Icon icon="material-symbols:lock-outline" width="20" height="20" />
      </div>
    </div>

    <div class="mt-1 flex items-center justify-between">
      <p>
        Current frame:
        <span class="font-chivo">
          {{
            datetimeFormat(activeLayer.frames[sliderIndex]?.timestamp, config.datetimeFormat) ?? '—'
          }}
        </span>
        <span class="font-chivo">&nbsp;{{ sliderLabel }} </span>
      </p>
      <Icon v-if="activeLayer.frameLoading" icon="eos-icons:loading" width="15" height="15" />
    </div>

    <div class="flex flex-col items-center gap-x-3">
      <!-- Slider wrapper that makes it visually obvious it is not scrollable -->

      <input v-if="activeLayer.frames.length" type="range" min="0" :max="activeLayer.frames.length - 1"
        v-model.number="sliderIndex" @change="onSliderChanged"
        :disabled="activeLayer.isPlaying || activeLayer.frameLoading || isFollowingPrimaryOnSecondary"
        :key="activeLayer.id" class="w-full timeline-range mb-1 mt-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        :style="{ '--track-bg': sliderGradient }" />


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
        <div v-if="props.mapTarget !== 'secondary'" class="flex items-center gap-x-1">
          <span>Opacity:</span>
          <input type="range" min="0" max="1" step="0.01" :value="activeLayerMain?.opacity ?? 1" @input="setOpacityMain"
            class="w-14 md:w-20" />
        </div>

        <!-- SECONDARY opacity only when UNLOCKED -->
        <div v-else-if="!config.followPrimary" class="flex items-center gap-x-1">
          <span>Opacity:</span>
          <input type="range" min="0" max="1" step="0.01" :value="activeLayerSecondary?.opacity ?? 1"
            @input="setOpacitySecondary" class="w-14 md:w-20" />
        </div>
      </div>

      <div v-if="!(props.mapTarget === 'secondary' && config.followPrimary)" class="flex items-center gap-x-1">
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

  <div v-else-if="activeLayer && !config.layerControlsVisible && (!device.isMobile && !config.dataPlottingVisible)"
    class="absolute bottom-3 rounded-md border border-gray-600 bg-gray-800/60 p-2 text-xs text-white backdrop-blur-xs md:text-sm">
    Current frame:
    <span class="font-chivo">
      {{ datetimeFormat(activeLayer.frames[sliderIndex]?.timestamp, config.datetimeFormat) ?? '—' }}
    </span>
  </div>
</template>

<style scoped>
.timeline-range {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
}

.timeline-range::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 3px;
  background: var(--track-bg);
}

.timeline-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 12px;
  width: 12px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.75);
  margin-top: -3px;
}

.timeline-range::-moz-range-track {
  height: 6px;
  border-radius: 3px;
  background: var(--track-bg);
}

.timeline-range::-moz-range-thumb {
  height: 12px;
  width: 12px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.75);
}
</style>
