<script setup lang="ts">
import { useActiveLayer } from '@/composables/useActiveLayer'
import { useRadarStore } from '@/stores/radar'
import { computed } from 'vue'

const radar = useRadarStore()
const { activeLayer, setLayer, clearLayer } = useActiveLayer()

const isRadarActive = computed(() => activeLayer.value?.name === 'Radar')

function toggleRadar() {
  if (isRadarActive.value) {
    clearLayer()
  } else {
    setLayer(radar, 'Radar')
  }
}
</script>

<template>
  <div class="absolute top-20 left-6 flex flex-col gap-y-3">
    <button
      @click="toggleRadar()"
      class="cursor-pointer rounded border px-2 py-1"
      :class="
        isRadarActive
          ? 'border-black bg-blue-600 text-white'
          : 'bg-blue-200 text-black hover:bg-blue-300'
      "
    >
      Radar
    </button>
  </div>
</template>
