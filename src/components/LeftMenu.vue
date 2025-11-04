<script setup lang="ts">
import { Icon } from '@iconify/vue'

import { useActiveLayer } from '@/composables/useActiveLayer'
import { useCmlDataStore } from '@/stores/cmlData'
import { useConfigStore } from '@/stores/config'
import { useLinksStore } from '@/stores/links'
import { useWeatherDataStore } from '@/stores/weatherData'
import { useWeatherStationsStore } from '@/stores/weatherStations'

import { computed } from 'vue'

const weatherStations = useWeatherStationsStore()
const weatherData = useWeatherDataStore()
const cmlData = useCmlDataStore()
const links = useLinksStore()
const config = useConfigStore()

const { activeLayer } = useActiveLayer()

const anyLayerActive = computed(() => activeLayer.value !== null)
</script>

<template>
  <div class="absolute top-14 left-3 flex flex-col gap-y-4 text-gray-300">
    <div class="flex flex-col gap-y-1">
      <Icon
        v-if="links.hasLinks"
        icon="hugeicons:satellite-01"
        width="38"
        height="38"
        class="cursor-pointer rounded-md border border-gray-600 bg-gray-800/50 p-1 backdrop-blur-xs hover:bg-gray-800/60 hover:text-cyan-200"
        :class="{ 'bg-gray-800/60 text-cyan-200': !links.hideAll }"
        @click="links.hideAll = !links.hideAll"
      />
      <Icon
        v-if="weatherStations.hasStations"
        icon="fluent:weather-cloudy-24-regular"
        width="38"
        height="38"
        class="cursor-pointer rounded-md border border-gray-600 bg-gray-800/50 p-1 backdrop-blur-xs hover:bg-gray-800/60 hover:text-cyan-200"
        :class="{ 'bg-gray-800/60 text-cyan-200': !weatherStations.hideAll }"
        @click="weatherStations.hideAll = !weatherStations.hideAll"
      />
    </div>
    <div class="flex flex-col gap-y-1">
      <Icon
        icon="solar:map-outline"
        width="38"
        height="38"
        class="cursor-pointer rounded-md border border-gray-600 bg-gray-800/50 p-1 backdrop-blur-xs hover:bg-gray-800/60 hover:text-cyan-200"
        :class="{ 'bg-gray-800/60 text-cyan-200': config.layerSwitcherVisible }"
        @click="
          () => {
            config.layerSwitcherVisible = !config.layerSwitcherVisible
            config.linkFilterVisible = false
          }
        "
      />

      <Icon
        v-if="anyLayerActive"
        icon="dashicons:controls-play"
        width="38"
        height="38"
        class="cursor-pointer rounded-md border border-gray-600 bg-gray-800/50 p-1 backdrop-blur-xs hover:bg-gray-800/60 hover:text-cyan-200"
        :class="{ 'bg-gray-800/60 text-cyan-200': config.layerControlsVisible }"
        @click="config.layerControlsVisible = !config.layerControlsVisible"
      />

      <Icon
        v-if="anyLayerActive"
        icon="lsicon:measure-outline"
        width="38"
        height="38"
        class="cursor-pointer rounded-md border border-gray-600 bg-gray-800/50 p-1 backdrop-blur-xs hover:bg-gray-800/60 hover:text-cyan-200"
        :class="{ 'bg-gray-800/60 text-cyan-200': config.barVisible }"
        @click="config.barVisible = !config.barVisible"
      />

      <Icon
        icon="carbon:filter"
        width="38"
        height="38"
        class="cursor-pointer rounded-md border border-gray-600 bg-gray-800/50 p-1 backdrop-blur-xs hover:bg-gray-800/60 hover:text-cyan-200"
        :class="{ 'bg-gray-800/60 text-cyan-200': config.linkFilterVisible }"
        @click="
          () => {
            config.linkFilterVisible = !config.linkFilterVisible
            config.layerSwitcherVisible = false
          }
        "
      />

      <Icon
        v-if="weatherData.stationIds.length > 0 || cmlData.cmlIds.length > 0"
        icon="iconoir:graph-up"
        width="38"
        height="38"
        class="hidden cursor-pointer rounded-md border border-gray-600 bg-gray-800/50 p-1 backdrop-blur-xs hover:bg-gray-800/60 hover:text-cyan-200 lg:block"
        :class="{
          'bg-gray-800/60 text-cyan-200':
            (weatherData.stationIds.length > 0 || cmlData.cmlIds.length > 0) &&
            config.dataPlottingVisible,
        }"
        @click="config.dataPlottingVisible = !config.dataPlottingVisible"
      />
    </div>
  </div>
</template>
