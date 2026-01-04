<script setup lang="ts">
import { Icon } from '@iconify/vue'

import { useActiveLayer } from '@/composables/useActiveLayer'
import { useConfigStore } from '@/stores/config'

import { computed } from 'vue'


const config = useConfigStore()

const {
  activeLayerSecondary,
} = useActiveLayer()

const layerSecondaryActive = computed(() => {
  return (
    activeLayerSecondary.value !== null
  )
})
</script>

<template>
  <div class="absolute top-14 left-[calc(50%+0.75rem)] flex flex-col gap-y-4 text-gray-300">

    <div class="flex flex-col gap-y-1">

      <button id="layer-button-secondary">
        <Icon icon="solar:map-outline" width="38" height="38" class="menu-btn "
          :class="{ active: config.secondaryLayerSwitcherVisible }" @click="
            () => {
              config.secondaryLayerSwitcherVisible = !config.secondaryLayerSwitcherVisible
            }
          " />
      </button>

      <button v-if="layerSecondaryActive">
        <Icon icon="material-symbols:lock-outline" width="38" height="38" class="menu-btn"
          :class="{ active: config.followPrimary }" @click="config.followPrimary = !config.followPrimary" />
      </button>

      <slot>
      </slot>
    </div>
  </div>
</template>
