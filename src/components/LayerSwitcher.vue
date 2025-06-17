<script setup lang="ts">
import { useActiveLayer } from '@/composables/useActiveLayer'
import { useImageLayer } from '@/composables/useImageLayer'
import { computed } from 'vue'

import { useConfigStore } from '@/stores/config'

const { activeLayer, setLayer, clearLayer } = useActiveLayer()
const config = useConfigStore()

const layers = [
  {
    id: 'maxz',
    label: 'Max Z',
    group: 'CHMI',
    layer: useImageLayer('maxz'),
  },
  {
    id: 'merge1h',
    label: 'Merge 1h',
    group: 'CHMI',
    layer: useImageLayer('merge1h'),
  },
  {
    id: 'raincz',
    label: 'Rain CZ',
    group: 'TelcoSense',
    layer: useImageLayer('raincz'),
  },
]

function toggleLayer(id: string, layer: ReturnType<typeof useImageLayer>) {
  if (activeLayer.value?.name === id) {
    clearLayer()
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
</script>

<template>
  <div class="absolute top-20 left-6 w-[130px] rounded-md bg-gray-800 p-3 text-sm">
    <span class="flex border-b border-gray-700 pb-1.5 text-white">Map layers</span>

    <span class="my-1.5 flex text-white">CHMI</span>
    <div class="flex flex-col gap-y-3">
      <button
        v-for="{ id, label, layer } in layers.filter((l) => l.group === 'CHMI')"
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
        >
          ●
        </div>
      </button>
    </div>

    <span v-if="config.realtime" class="my-1.5 flex text-white">TelcoSense</span>
    <div v-if="config.realtime" class="flex flex-col gap-y-3">
      <button
        v-for="{ id, label, layer } in layers.filter((l) => l.group === 'TelcoSense')"
        :key="id"
        @click="toggleLayer(id, layer)"
        class="flex h-8 flex-nowrap items-center justify-between gap-x-2 rounded-md border border-gray-700 px-3 text-gray-500 enabled:cursor-pointer enabled:text-white enabled:hover:bg-gray-500"
        :class="isActive(id).value ? 'bg-gray-600' : 'border border-gray-700'"
        :disabled="layer.frames.value.length === 0"
      >
        <div>{{ label }}</div>
        <div :class="layer.frames.value.length > 0 ? 'text-green-600' : 'text-red-600'">●</div>
      </button>
    </div>
  </div>
</template>
