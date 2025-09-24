<script setup lang="ts">
import { useActiveLayer } from '@/composables/useActiveLayer'
import { useImageLayer } from '@/composables/useImageLayer'
import { useConfigStore } from '@/stores/config'

import { computed } from 'vue'
import { useRoute } from 'vue-router'

const { activeLayer, setLayer, hideLayer } = useActiveLayer()
const config = useConfigStore()

const route = useRoute()

const layers = [
  {
    id: 'maxz',
    label: 'Max Z',
    group: 'CHMI',
    layer: useImageLayer('maxz'),
    showOnRoutes: ['rain'],
  },
  {
    id: 'merge1h',
    label: 'Merge 1h',
    group: 'CHMI',
    layer: useImageLayer('merge1h'),
    showOnRoutes: ['rain'],
  },
  {
    id: 'raincz',
    label: 'Rain CZ',
    group: 'TelcoSense',
    layer: useImageLayer('raincz'),
    showOnRoutes: ['rain'],
  },
  {
    id: 'user-calc',
    label: 'User calc',
    group: 'TelcoSense',
    layer: useImageLayer('user-calc'),
    showOnRoutes: ['rain'],
  },
  // telcotemp
  {
    id: 'tempcz',
    label: 'Temp CZ',
    group: 'TelcoSense',
    layer: useImageLayer('tempcz'),
    showOnRoutes: ['temp'],
  },
]

function toggleLayer(id: string, layer: ReturnType<typeof useImageLayer>) {
  if (activeLayer.value?.name === id) {
    hideLayer()
  } else {
    setLayer(layer, id)
  }
}

function isActive(id: string) {
  return computed(() => activeLayer.value?.name === id)
}

const isCustomRangeUnset = computed(() => {
  return !config.start && !config.end && !config.realtime
})

const chmiLayers = computed(() =>
  layers.filter((l) => l.group === 'CHMI' && l.showOnRoutes?.includes(route.name as string)),
)

const telcoLayers = computed(() =>
  layers.filter(
    (l) =>
      l.group === 'TelcoSense' &&
      l.showOnRoutes?.includes(route.name as string) &&
      (l.id !== 'user-calc' || !config.realtime),
  ),
)
</script>

<template>
  <div class="absolute top-20 left-6 w-[150px] rounded-md bg-gray-800 p-3 text-sm">
    <span class="flex border-b border-gray-700 pb-1.5 text-white">Map layers</span>

    <span v-if="chmiLayers.length > 0" class="my-1.5 flex text-white">CHMI</span>
    <div class="flex flex-col gap-y-3">
      <button
        v-for="{ id, label, layer } in chmiLayers"
        :key="id"
        @click="toggleLayer(id, layer)"
        class="flex h-8 flex-nowrap items-center justify-between gap-x-2 rounded-md border border-gray-700 px-3 text-gray-500 enabled:cursor-pointer enabled:text-white enabled:hover:bg-gray-500"
        :class="isActive(id).value ? 'bg-gray-600' : 'border border-gray-700'"
        :disabled="layer.frames.value.length === 0 || isCustomRangeUnset"
      >
        <div>{{ label }}</div>
        <div
          :class="
            layer.frames.value.length > 0 && !isCustomRangeUnset ? 'text-green-600' : 'text-red-600'
          "
          class="text-lg"
        >
          ●
        </div>
      </button>
    </div>

    <span class="my-1.5 flex text-white">TelcoSense</span>
    <div class="flex flex-col gap-y-3">
      <button
        v-for="{ id, label, layer } in telcoLayers"
        :key="id"
        @click="toggleLayer(id, layer)"
        class="flex h-8 flex-nowrap items-center justify-between gap-x-2 rounded-md border border-gray-700 px-3 text-gray-500 enabled:cursor-pointer enabled:text-white enabled:hover:bg-gray-500"
        :class="isActive(id).value ? 'bg-gray-600' : 'border border-gray-700'"
        :disabled="layer.frames.value.length === 0 || isCustomRangeUnset"
      >
        <div>{{ label }}</div>
        <div
          :class="{
            'text-green-600': layer.frames.value.length > 0 && !isCustomRangeUnset,
            'text-red-600': layer.frames.value.length === 0 || isCustomRangeUnset,
          }"
          class="text-lg"
        >
          ●
        </div>
      </button>
    </div>

    <!-- <button
      class="mt-4 cursor-pointer rounded px-2 py-1 text-sm"
      :class="
        showLatestFrame ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      "
      @click="showLatestFrame = !showLatestFrame"
    >
      Show latest frame
    </button> -->
  </div>
</template>
