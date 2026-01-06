<script setup lang="ts">
import { useCmlDataStore } from '@/stores/cmlData'
import { useConfigStore } from '@/stores/config'

import { useAuthStore } from '@/stores/auth'
import { useWeatherDataStore } from '@/stores/weatherData'
import { computed } from 'vue'

import { useActiveLayer } from '@/composables/useActiveLayer'

import MultiPlot from '@/components/MultiPlot.vue'
import { useRoute } from 'vue-router'

defineProps<{
  start: string | null
  end: string | null
}>()

const weatherData = useWeatherDataStore()
const cmlData = useCmlDataStore()
const config = useConfigStore()
const { activeLayerMain } = useActiveLayer()
const route = useRoute()
const auth = useAuthStore()

const isRainRoute = computed(() => route.path.includes('rain'))
const isTempRoute = computed(() => route.path.includes('temp'))

const currentCursorTime = computed(() => {
  const frame = activeLayerMain.value?.frames[activeLayerMain.value.currentIndex]
  return frame?.timestamp ?? undefined
})

function y(side: 'left' | 'right') {
  return side
}

const seriesData = computed(() => {
  const data = [
    {
      name: 'Weather station rainfall',
      data: weatherData.currentPrecipitation,
      subplotIndex: 0,
      yAxisSide: y('left'),
    },
    {
      name: 'Weather station temp',
      data: weatherData.currentTemperature,
      subplotIndex: 0,
      yAxisSide: y('right'),
    },
    {
      name: 'TRSL A',
      data: cmlData.selectedCmlId ? (cmlData.cmls.get(cmlData.selectedCmlId)?.trslA ?? []) : [],
      subplotIndex: 1,
      yAxisSide: y('left'),
    },
    {
      name: 'TRSL B',
      data: cmlData.selectedCmlId ? (cmlData.cmls.get(cmlData.selectedCmlId)?.trslB ?? []) : [],
      subplotIndex: 1,
      yAxisSide: y('left'),
    },
    {
      name: 'HW temp A',
      data: cmlData.selectedCmlId
        ? (cmlData.cmls.get(cmlData.selectedCmlId)?.temperatureA ?? [])
        : [],
      subplotIndex: 1,
      yAxisSide: y('right'),
    },
    {
      name: 'HW temp B',
      data: cmlData.selectedCmlId
        ? (cmlData.cmls.get(cmlData.selectedCmlId)?.temperatureB ?? [])
        : [],
      subplotIndex: 1,
      yAxisSide: y('right'),
    },
  ]

  if (isRainRoute.value) {
    data.push({
      name: 'Rain intensity',
      data: cmlData.selectedCmlId
        ? (cmlData.cmls.get(cmlData.selectedCmlId)?.rainIntensity ?? [])
        : [],
      subplotIndex: 2,
      yAxisSide: y('left'),
    })
  }

  if (isTempRoute.value) {
    data.push({
      name: 'Pred temp A',
      data: cmlData.selectedCmlId ? (cmlData.cmls.get(cmlData.selectedCmlId)?.tempPredA ?? []) : [],
      subplotIndex: 2,
      yAxisSide: y('left'),
    })
  }

  if (isTempRoute.value) {
    data.push({
      name: 'Pred temp B',
      data: cmlData.selectedCmlId ? (cmlData.cmls.get(cmlData.selectedCmlId)?.tempPredB ?? []) : [],
      subplotIndex: 2,
      yAxisSide: y('left'),
    })
  }

  return data
})
</script>

<template>
  <div v-if="(weatherData.stationIds.length > 0 || cmlData.cmlIds.length > 0) && (config.start && config.end)"
    class="absolute md:bottom-38 bottom-3 flex md:max-w-[1000px] w-[calc(100%-1.5rem)] flex-col gap-1 z-25"
    :class="auth.isLoggedIn ? 'md:h-[450px] h-[280px]' : 'md:h-[280px] h-[280px]'">
    <div class="flex h-8 items-center justify-between gap-2">
      <div class="rounded-md bg-gray-800/50 px-3 md:py-1 py-0.5 md:text-sm text-xs text-white backdrop-blur-xs">
        Stations
      </div>
      <div class="flex-1 overflow-x-auto whitespace-nowrap">
        <div class="flex gap-x-2">
          <button v-for="stationId in weatherData.stationIds" :key="stationId"
            @click="weatherData.selectStation(stationId)" @dblclick.stop="weatherData.removeStation(stationId)"
            class="inline-block cursor-pointer rounded-md px-3 md:py-1 py-0.5 md:text-sm font-medium text-xs" :class="stationId === weatherData.selectedStationId
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              ">
            {{ stationId }}
          </button>
        </div>
      </div>
      <button v-if="weatherData.stationIds.length > 0" @click="() => {
        weatherData.clear()
        if (weatherData.stationIds.length === 0 && cmlData.cmlIds.length === 0) {
          config.dataPlottingVisible = false
        }
      }"
        class="shrink-0 cursor-pointer rounded-md bg-red-600 px-3 md:py-1 py-0.5 md:text-sm text-xs text-white hover:bg-red-700">
        Clear
      </button>
      <!-- <button
        @click="dataPlottingVisible = !dataPlottingVisible"
        class="cursor-pointer rounded-md bg-gray-600 px-3 py-1 text-sm text-white hover:bg-gray-500 hover:opacity-100"
      >
        Hide plot
      </button> -->
    </div>

    <div v-if="start && end" class="flex flex-1 flex-col items-center justify-center rounded-md bg-gray-800 p-2">
      <div v-if="weatherData.loading || cmlData.loading" class="animate-pulse text-sm text-gray-300">
        Loading data...
      </div>
      <MultiPlot v-else-if="(weatherData.selectedStationId || cmlData.selectedCmlId) && isRainRoute"
        :seriesData="seriesData" :xMin="start" :xMax="end" :cursorTime="currentCursorTime"
        :topLeftAxisName="'Rainfall (mm)'" :topRightAxisName="'Temperature (°C)'" :bottomLeftAxisName="'TRSL (dB)'"
        :bottomRightAxisName="'Temperature (°C)'" :thirdLeftAxisName="'Rain int. (mm/h)'" />
      <MultiPlot v-else-if="(weatherData.selectedStationId || cmlData.selectedCmlId) && isTempRoute"
        :seriesData="seriesData" :xMin="start" :xMax="end" :cursorTime="currentCursorTime"
        :topLeftAxisName="'Rainfall (mm)'" :topRightAxisName="'Temperature (°C)'" :bottomLeftAxisName="'TRSL (dB)'"
        :bottomRightAxisName="'Temperature (°C)'" :thirdLeftAxisName="'Temperature (°C)'" />
    </div>

    <div v-show="auth.isLoggedIn" class="flex h-8 items-center justify-between gap-2">
      <div class="rounded-md bg-gray-800/50 px-3 md:py-1 py-0.5 md:text-sm text-xs text-white backdrop-blur-xs">
        Links
      </div>
      <div class="flex-1 gap-x-2 overflow-x-auto whitespace-nowrap">
        <div class="flex gap-x-2">
          <button v-for="cmlId in cmlData.cmlIds" :key="cmlId" @click="cmlData.selectCml(cmlId)"
            @dblclick.stop="cmlData.removeCml(cmlId)"
            class="inline-block cursor-pointer rounded-md px-3 md:py-1 py-0.5 md:text-sm font-medium text-xs" :class="cmlId === cmlData.selectedCmlId
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              ">
            {{ cmlId }}
          </button>
        </div>
      </div>
      <button v-if="cmlData.cmlIds.length > 0" @click="() => {
        cmlData.clear()
        if (weatherData.stationIds.length === 0 && cmlData.cmlIds.length === 0) {
          config.dataPlottingVisible = false
        }
      }"
        class="shrink-0 cursor-pointer rounded-md bg-red-600 px-3 md:py-1 py-0.5 md:text-sm text-xs text-white hover:bg-red-700">
        Clear
      </button>
    </div>
  </div>
</template>
