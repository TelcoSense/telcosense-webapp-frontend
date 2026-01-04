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

const {
  activeLayerMain,
} = useActiveLayer()

const layerMainActive = computed(() => {
  return (
    activeLayerMain.value !== null
  )
})
</script>

<template>
  <div class="absolute top-14 left-3 flex flex-col gap-y-4 text-gray-300">
    <div class="flex flex-col gap-y-1">
      <button v-if="links.hasLinks">
        <Icon icon="hugeicons:satellite-01" width="38" height="38" class="menu-btn" :class="{ active: !links.hideAll }"
          @click="links.hideAll = !links.hideAll" />
      </button>

      <button v-if="weatherStations.hasStations">
        <Icon icon="fluent:weather-cloudy-24-regular" width="38" height="38" class="menu-btn"
          :class="{ active: !weatherStations.hideAll }" @click="weatherStations.hideAll = !weatherStations.hideAll" />
      </button>
      <slot name="up">
      </slot>
    </div>
    <div class="flex flex-col gap-y-1">

      <button>
        <Icon icon="carbon:split-screen" width="38" height="38" class="menu-btn" :class="{ active: config.splitView }"
          @click="
            () => {
              config.toggleSplitView()
            }
          " />
      </button>

      <button id="link-filter-button">
        <Icon icon="carbon:filter" width="38" height="38" class="menu-btn" :class="{ active: config.linkFilterVisible }"
          @click="
            () => {
              config.linkFilterVisible = !config.linkFilterVisible
              config.mainLayerSwitcherVisible = false
            }
          " />
      </button>

      <button id="layer-button-main">
        <Icon icon="solar:map-outline" width="38" height="38" class="menu-btn"
          :class="{ active: config.mainLayerSwitcherVisible }" @click="
            () => {
              config.mainLayerSwitcherVisible = !config.mainLayerSwitcherVisible
              config.linkFilterVisible = false
            }
          " />
      </button>

      <button v-if="layerMainActive">
        <Icon icon="dashicons:controls-play" width="38" height="38" class="menu-btn"
          :class="{ active: config.layerControlsVisible }"
          @click="config.layerControlsVisible = !config.layerControlsVisible" />

      </button>

      <button v-if="layerMainActive">
        <Icon icon="lsicon:measure-outline" width="38" height="38" class="menu-btn"
          :class="{ active: config.barVisible }" @click="config.barVisible = !config.barVisible" />
      </button>



      <button v-if="(weatherData.stationIds.length > 0 || cmlData.cmlIds.length > 0) && (config.start && config.end)">
        <Icon icon="iconoir:graph-up" width="38" height="38" class=" menu-btn " :class="{
          active:
            (weatherData.stationIds.length > 0 || cmlData.cmlIds.length > 0) &&
            config.dataPlottingVisible && (config.start && config.end),
        }" @click="config.dataPlottingVisible = !config.dataPlottingVisible" />
      </button>

      <slot name="down">
      </slot>
    </div>
  </div>
</template>
