<script setup lang="ts">
import { useConfigStore } from '@/stores/config';
import { Icon } from '@iconify/vue';

const config = useConfigStore()

</script>

<template>
  <div class="absolute top-14 left-[calc(50%+0.75rem)] flex flex-col gap-y-4 text-gray-300 z-50">

    <div class="flex flex-col gap-y-1">

      <button id="layer-button-secondary">
        <Icon icon="solar:map-outline" width="38" height="38" class="menu-btn "
          :class="{ active: config.secondaryLayerSwitcherVisible }" @click="
            () => {
              config.secondaryLayerSwitcherVisible = !config.secondaryLayerSwitcherVisible
            }
          " />
      </button>

      <button v-if="config.splitView">
        <Icon icon="material-symbols:lock-outline" width="38" height="38" class="menu-btn"
          :class="{ active: config.followPrimary }" @click="config.followPrimary = !config.followPrimary" />
      </button>

      <slot>
      </slot>
    </div>
  </div>
</template>
