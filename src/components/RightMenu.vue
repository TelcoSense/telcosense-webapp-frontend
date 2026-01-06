<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { useConfigStore } from '@/stores/config'

const config = useConfigStore()

const route = useRoute()
const currentRouteName = computed(() => route.name as string)

// orange accents on temp route, default elsewhere
const btnClass = computed(() =>
  currentRouteName.value === 'temp' ? 'menu-btn-orange' : 'menu-btn'
)
</script>

<template>
  <div class="absolute top-14 left-[calc(50%+0.75rem)] flex flex-col gap-y-4 text-gray-300 z-50">
    <div class="flex flex-col gap-y-1">
      <button id="layer-button-secondary">
        <Icon icon="solar:map-outline" width="38" height="38"
          :class="[btnClass, { active: config.secondaryLayerSwitcherVisible }]"
          @click="config.secondaryLayerSwitcherVisible = !config.secondaryLayerSwitcherVisible" />
      </button>

      <button v-if="config.splitView">
        <Icon icon="material-symbols:lock-outline" width="38" height="38"
          :class="[btnClass, { active: config.followPrimary }]" @click="config.followPrimary = !config.followPrimary" />
      </button>

      <slot />
    </div>
  </div>
</template>