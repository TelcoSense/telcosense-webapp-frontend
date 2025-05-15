<script setup lang="ts">
import { useActiveLayer } from '@/composables/useActiveLayer'
import { useImageLayer } from '@/composables/useImageLayer'
import { computed } from 'vue'

const { activeLayer, setLayer, clearLayer } = useActiveLayer()

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
</script>

<template>
  <div class="absolute top-20 left-6 w-[120px] rounded-md bg-gray-800 p-3">
    <span class="flex border-b border-gray-700 pb-1.5 text-white">Map layers</span>

    <template v-for="group in ['CHMI', 'TelcoSense']" :key="group">
      <span class="my-1.5 flex text-white">{{ group }}</span>
      <div class="flex flex-col gap-y-3">
        <button
          v-for="{ id, label, layer } in layers.filter((l) => l.group === group)"
          :key="id"
          @click="toggleLayer(id, layer)"
          class="h-8 cursor-pointer rounded-md px-3 text-white hover:bg-gray-500 hover:opacity-100"
          :class="isActive(id).value ? 'bg-gray-600' : 'border border-gray-700 opacity-40'"
        >
          {{ label }}
        </button>
      </div>
    </template>
  </div>
</template>
