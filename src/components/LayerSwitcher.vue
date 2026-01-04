<script setup lang="ts">
import { useActiveLayer } from '@/composables/useActiveLayer'
import { useImageLayer } from '@/composables/useImageLayer'
import { useConfigStore } from '@/stores/config'

import type { ImageSequenceLayer } from '@/composables/useImageSequenceLayer'
import type { PropType } from 'vue'

import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps({
  mapTarget: {
    type: String as PropType<'main' | 'secondary'>,
    default: 'main',
  },
})

const {
  activeLayerMain,
  setMainLayer,
  hideMainLayer,

  activeLayerSecondary,
  setSecondaryLayer,
  hideSecondaryLayer,
} = useActiveLayer()

const activeLayer = computed(() =>
  props.mapTarget === 'main'
    ? activeLayerMain.value
    : activeLayerSecondary.value
)

function setLayerForTarget(layer: ImageSequenceLayer, id: string, name: string) {
  if (props.mapTarget === 'main') {
    setMainLayer(layer, id, name)
  } else {
    setSecondaryLayer(layer, id, name)
  }
}

function hideLayerForTarget() {
  if (props.mapTarget === 'main') {
    hideMainLayer()
  } else {
    hideSecondaryLayer()
  }
}

const config = useConfigStore()

const route = useRoute()

const layers = [
  {
    id: 'maxz',
    label: 'Max Z',
    group: 'CHMI',
    layer: computed(() => useImageLayer(props.mapTarget, 'maxz')),
    showOnRoutes: ['rain'],
  },
  {
    id: 'merge1h',
    label: 'Merge 1h',
    group: 'CHMI',
    layer: computed(() => useImageLayer(props.mapTarget, 'merge1h')),
    showOnRoutes: ['rain'],
  },
  {
    id: 'raincz',
    label: 'Rain CZ',
    group: 'TelcoSense',
    layer: computed(() => useImageLayer(props.mapTarget, 'raincz')),
    showOnRoutes: ['rain'],
  },
  {
    id: 'user-calc',
    label: 'User calc',
    group: 'TelcoSense',
    layer: computed(() => useImageLayer(props.mapTarget, 'user-calc')),
    showOnRoutes: ['rain'],
  },
  {
    id: 'tempcz',
    label: 'Temp CZ',
    group: 'TelcoSense',
    layer: computed(() => useImageLayer(props.mapTarget, 'tempcz')),
    showOnRoutes: ['temp'],
  },
  {
    id: 'tempchmi',
    label: 'Temp CHMI',
    group: 'TelcoSense',
    layer: computed(() => useImageLayer(props.mapTarget, 'tempchmi')),
    showOnRoutes: ['temp'],
  },
]

function toggleLayer(id: string, name: string, layerRef: { value: ImageSequenceLayer }) {
  config.setLayerSwitchedTime()
  const layer = layerRef.value

  if (activeLayer.value?.id === id) {
    hideLayerForTarget()
  } else {
    config.layerControlsVisible = true
    config.barVisible = true
    setLayerForTarget(layer, id, name)
  }
}

function isActive(id: string) {
  return computed(() => activeLayer.value?.id === id)
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
      // show "user-calc" ONLY on primary (main) map
      (l.id !== 'user-calc' || props.mapTarget === 'main') &&
      // keep existing rule
      (l.id !== 'user-calc' || !config.realtime),
  ),
)
</script>

<template>
  <div class="absolute top-14 left-15 w-[133px] rounded-md  bg-gray-800 p-2 text-xs backdrop-blur-xs md:text-sm z-50">
    <span class="flex border-b border-gray-600 pb-1.5 text-white">Map layers</span>

    <span v-if="chmiLayers.length > 0" class="my-1.5 flex text-white">CHMI</span>
    <div class="flex flex-col gap-y-2">
      <button v-for="{ id, label, layer } in chmiLayers" :key="id" @click="toggleLayer(id, label, layer)"
        :disabled="layer.value.frames.value.length === 0 || isCustomRangeUnset" :class="[
          'group flex h-8 w-full items-center justify-between gap-x-2 rounded-lg px-2 text-sm  select-none',
          'bg-gray-700/70 backdrop-blur-sm',
          'enabled:cursor-pointer enabled:hover:bg-gray-600/70',
          isActive(id).value
            ? [
              'bg-gray-600/90 text-blue-200',
              'border border-blue-200',
            ]
            : 'text-gray-300 border border-transparent',
          'disabled:bg-gray-800/60 disabled:text-gray-500 disabled:cursor-not-allowed',
        ]">

        <div class=" whitespace-normal">
          {{ label }}
        </div>

        <div class="text-white" v-if="!(layer.value.frames.value.length > 0 && !isCustomRangeUnset)">
          <Icon icon="eos-icons:loading" width="18" height="18" />
        </div>
      </button>
    </div>

    <span class="my-1.5 flex text-white">TelcoSense</span>
    <div class="flex flex-col gap-y-2">
      <button v-for="{ id, label, layer } in telcoLayers" :key="id" @click="toggleLayer(id, label, layer)"
        :disabled="layer.value.frames.value.length === 0 || isCustomRangeUnset" :class="[
          'group flex h-8 w-full items-center justify-between gap-x-2 rounded-lg px-2 text-sm  select-none',
          'bg-gray-700/70 backdrop-blur-sm',
          'enabled:cursor-pointer enabled:hover:bg-gray-600/70',
          isActive(id).value
            ? [
              'bg-gray-600/90 text-blue-200',
              'border border-blue-200',
            ]
            : 'text-gray-300 border border-transparent',
          'disabled:bg-gray-800/60 disabled:text-gray-500 disabled:cursor-not-allowed',
        ]">

        <div class=" whitespace-normal">
          {{ label }}
        </div>

        <div class="text-white" v-if="!(layer.value.frames.value.length > 0 && !isCustomRangeUnset)">
          <Icon icon="eos-icons:loading" width="18" height="18" />
        </div>
      </button>
    </div>

  </div>
</template>
