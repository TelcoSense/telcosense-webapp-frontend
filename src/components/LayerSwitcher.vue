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
  props.mapTarget === 'main' ? activeLayerMain.value : activeLayerSecondary.value,
)

function setLayerForTarget(layer: ImageSequenceLayer, id: string, name: string) {
  if (props.mapTarget === 'main') setMainLayer(layer, id, name)
  else setSecondaryLayer(layer, id, name)
}

function hideLayerForTarget() {
  if (props.mapTarget === 'main') hideMainLayer()
  else hideSecondaryLayer()
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
    label: 'Rain intensity',
    group: 'TelcoRain',
    layer: computed(() => useImageLayer(props.mapTarget, 'raincz')),
    showOnRoutes: ['rain'],
  },
  // {
  //   id: 'rainsum',
  //   label: 'Rain sum 1h',
  //   group: 'TelcoRain',
  //   layer: computed(() => useImageLayer(props.mapTarget, 'rainsum')),
  //   showOnRoutes: ['rain'],
  // },
  {
    id: 'user-calc',
    label: 'User intensity',
    group: 'TelcoRain',
    layer: computed(() => useImageLayer(props.mapTarget, 'user-calc')),
    showOnRoutes: ['rain'],
  },
  {
    id: 'user-sum',
    label: 'User sum',
    group: 'TelcoRain',
    layer: computed(() => useImageLayer(props.mapTarget, 'user-sum')),
    showOnRoutes: ['rain'],
  },
  {
    id: 'tempcz',
    label: 'Temp CZ',
    group: 'TelcoTemp',
    layer: computed(() => useImageLayer(props.mapTarget, 'tempcz')),
    showOnRoutes: ['temp'],
  },
  {
    id: 'tempchmi',
    label: 'Temp CHMI',
    group: 'TelcoTemp',
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

const isCustomRangeUnset = computed(() => !config.start && !config.end && !config.realtime)

const currentRouteName = computed(() => route.name as string)

const chmiLayers = computed(() =>
  layers.filter((l) => l.group === 'CHMI' && l.showOnRoutes?.includes(currentRouteName.value)),
)

function isActive(id: string) {
  return activeLayer.value?.id === id
}

// Telco groups in a fixed order (so UI doesn’t jump)
const TELCO_GROUPS = ['TelcoRain', 'TelcoTemp'] as const

const telcoSections = computed(() => {
  const routeName = currentRouteName.value

  return TELCO_GROUPS.map((group) => {
    const items = layers.filter(
      (l) =>
        l.group === group &&
        l.showOnRoutes?.includes(routeName) &&
        // show "user-calc" ONLY on primary (main) map
        (l.id !== 'user-calc' || props.mapTarget === 'main') &&
        (l.id !== 'user-sum' || props.mapTarget === 'main') &&
        // keep existing rule
        (l.id !== 'user-calc' || !config.realtime) &&
        (l.id !== 'user-sum' || !config.realtime),
    )

    // map group -> label shown in UI
    const label = group === 'TelcoRain' ? 'TelcoRain' : 'TelcoTemp'

    return { group, label, items }
  }).filter((s) => s.items.length > 0)
})
</script>

<template>
  <div class="absolute top-14 left-15 z-50 w-[133px] rounded-md bg-gray-800 p-2 text-xs backdrop-blur-xs md:text-sm">
    <span class="flex border-b border-gray-600 pb-1.5 text-white">Map layers</span>

    <!-- CHMI -->
    <span v-if="chmiLayers.length > 0" class="my-1.5 flex text-white">CHMI</span>
    <div v-if="chmiLayers.length > 0" class="flex flex-col gap-y-2">
      <button v-for="{ id, label, layer } in chmiLayers" :key="id" @click="toggleLayer(id, label, layer)"
        :disabled="layer.value.frames.value.length === 0 || isCustomRangeUnset" :class="[
          'group flex h-8 w-full items-center justify-between gap-x-2 rounded-lg px-2 text-sm select-none',
          'bg-gray-700/70 backdrop-blur-sm',
          'enabled:cursor-pointer enabled:hover:bg-gray-600/70',
          isActive(id)
            ? ['bg-gray-600/90 text-blue-200', 'border border-blue-200']
            : 'border border-transparent text-gray-300',
          'disabled:cursor-not-allowed disabled:bg-gray-800/60 disabled:text-gray-500',
        ]">
        <div class="whitespace-normal">
          {{ label }}
        </div>

        <div class="text-white" v-if="
          !(layer.value.frames.value.length > 0 && !isCustomRangeUnset) && !layer.value.loading
        ">
          <Icon icon="eos-icons:loading" width="18" height="18" />
        </div>
      </button>
    </div>

    <!-- TelcoRain / TelcoTemp (route-dependent) -->
    <template v-for="section in telcoSections" :key="section.group">
      <span class="my-1.5 flex text-white">{{ section.label }}</span>

      <div class="flex flex-col gap-y-2">
        <button v-for="{ id, label, layer } in section.items" :key="id" @click="toggleLayer(id, label, layer)"
          :disabled="layer.value.frames.value.length === 0 || isCustomRangeUnset" :class="[
            'group flex h-8 w-full items-center justify-between gap-x-2 rounded-lg px-2 text-sm select-none',
            'bg-gray-700/70 backdrop-blur-sm',
            'enabled:cursor-pointer enabled:hover:bg-gray-600/70',
            isActive(id)
              ? ['bg-gray-600/90 text-blue-200', 'border border-blue-200']
              : 'border border-transparent text-gray-300',
            'disabled:cursor-not-allowed disabled:bg-gray-800/60 disabled:text-gray-500',
          ]">
          <div class="whitespace-normal">
            {{ label }}
          </div>

          <div class="text-white" v-if="
            !(layer.value.frames.value.length > 0 && !isCustomRangeUnset) && !layer.value.loading
          ">
            <Icon icon="eos-icons:loading" width="18" height="18" />
          </div>
        </button>
      </div>
    </template>
  </div>
</template>
