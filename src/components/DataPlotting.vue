<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useCmlDataStore } from '@/stores/cmlData'
import { useConfigStore } from '@/stores/config'
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
const auth = useAuthStore()
const { activeLayerMain } = useActiveLayer()
const route = useRoute()

const isRainRoute = computed(() => route.path.includes('rain'))
const isTempRoute = computed(() => route.path.includes('temp'))

const currentCursorTime = computed(() => {
  const frame = activeLayerMain.value?.frames[activeLayerMain.value.currentIndex]
  return frame?.timestamp ?? undefined
})

function y(side: 'left' | 'right') {
  return side
}

const selectedCml = computed(() => {
  if (!cmlData.selectedCmlId) return null
  return cmlData.cmls.get(cmlData.selectedCmlId) ?? null
})

const seriesData = computed(() => {
  const data: Array<{
    name: string
    data: { time: string; value: number | null }[]
    subplotIndex: number
    yAxisSide: 'left' | 'right'
  }> = [
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
    ]

  // Logged-in users: full internal plots
  if (auth.hasFullLinkAccess) {
    data.push(
      {
        name: 'TRSL A',
        data: selectedCml.value?.trslA ?? [],
        subplotIndex: 1,
        yAxisSide: y('left'),
      },
      {
        name: 'TRSL B',
        data: selectedCml.value?.trslB ?? [],
        subplotIndex: 1,
        yAxisSide: y('left'),
      },
      {
        name: 'HW temp A',
        data: selectedCml.value?.temperatureA ?? [],
        subplotIndex: 1,
        yAxisSide: y('right'),
      },
      {
        name: 'HW temp B',
        data: selectedCml.value?.temperatureB ?? [],
        subplotIndex: 1,
        yAxisSide: y('right'),
      },
    )

    if (isRainRoute.value) {
      data.push({
        name: 'Rain intensity',
        data: selectedCml.value?.rainIntensity ?? [],
        subplotIndex: 2,
        yAxisSide: y('left'),
      })
    }

    if (isTempRoute.value) {
      data.push(
        {
          name: 'Pred temp A',
          data: selectedCml.value?.tempPredA ?? [],
          subplotIndex: 2,
          yAxisSide: y('left'),
        },
        {
          name: 'Pred temp B',
          data: selectedCml.value?.tempPredB ?? [],
          subplotIndex: 2,
          yAxisSide: y('left'),
        },
      )
    }

    return data
  }

  if (auth.hasBasicLinkAccess) {
    if (isRainRoute.value) {
      data.push({
        name: 'Rain intensity',
        data: selectedCml.value?.rainIntensity ?? [],
        subplotIndex: 1,
        yAxisSide: y('left'),
      })
    }

    if (isTempRoute.value) {
      data.push(
        {
          name: 'Pred temp A',
          data: selectedCml.value?.tempPredA ?? [],
          subplotIndex: 1,
          yAxisSide: y('left'),
        },
        {
          name: 'Pred temp B',
          data: selectedCml.value?.tempPredB ?? [],
          subplotIndex: 1,
          yAxisSide: y('left'),
        },
      )
    }
  }

  return data
})

const hasAnyPlotSelection = computed(() => {
  return Boolean(weatherData.selectedStationId || cmlData.selectedCmlId)
})

function clearStations() {
  weatherData.clear()
  if (weatherData.stationIds.length === 0 && cmlData.cmlIds.length === 0) {
    config.dataPlottingVisible = false
  }
}

function clearLinks() {
  cmlData.clear()
  if (weatherData.stationIds.length === 0 && cmlData.cmlIds.length === 0) {
    config.dataPlottingVisible = false
  }
}

const publicSecondAxisName = computed(() => {
  if (isRainRoute.value) return 'Rain int. (mm/h)'
  if (isTempRoute.value) return 'Temperature (°C)'
  return ''
})

const visibleSubplotCount = computed(() => {
  if (auth.hasFullLinkAccess) return 3
  if (auth.hasBasicLinkAccess) return 2
  return 1
})

const plottingContainerClass = computed(() => {
  if (visibleSubplotCount.value === 1) {
    return 'h-[220px] md:h-[240px]'
  }

  if (visibleSubplotCount.value === 2) {
    return 'h-[280px] md:h-[300px]'
  }

  return 'h-[320px] md:h-[360px]'
})
</script>

<template>
  <div v-if="(weatherData.stationIds.length > 0 || cmlData.cmlIds.length > 0) && config.start && config.end"
    class="absolute bottom-3 z-25 flex w-[calc(100%-1.5rem)] flex-col gap-1 md:bottom-38 md:max-w-[1000px]"
    :class="plottingContainerClass">
    <div class="flex h-8 items-center justify-between gap-2">
      <div class="rounded-md bg-gray-800/50 px-3 py-0.5 text-xs text-white backdrop-blur-xs md:py-1 md:text-sm">
        Stations
      </div>

      <div class="flex-1 overflow-x-auto whitespace-nowrap">
        <div class="flex gap-x-2">
          <button v-for="stationId in weatherData.stationIds" :key="stationId"
            class="inline-block cursor-pointer rounded-md px-3 py-0.5 text-xs font-medium md:py-1 md:text-sm" :class="stationId === weatherData.selectedStationId
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              " @click="weatherData.selectStation(stationId)" @dblclick.stop="weatherData.removeStation(stationId)">
            {{ stationId }}
          </button>
        </div>
      </div>

      <button v-if="weatherData.stationIds.length > 0"
        class="shrink-0 cursor-pointer rounded-md bg-red-600 px-3 py-0.5 text-xs text-white hover:bg-red-700 md:py-1 md:text-sm"
        @click="clearStations">
        Clear
      </button>
    </div>

    <div v-if="start && end" class="flex flex-1 flex-col items-center justify-center rounded-md bg-gray-800 p-2">
      <div v-if="weatherData.loading || cmlData.loading" class="animate-pulse text-sm text-gray-300">
        Loading data...
      </div>

      <MultiPlot v-else-if="hasAnyPlotSelection && isRainRoute" :seriesData="seriesData" :xMin="start" :xMax="end"
        :cursorTime="currentCursorTime" :topLeftAxisName="'Rainfall (mm)'" :topRightAxisName="'Temperature (°C)'"
        :bottomLeftAxisName="auth.hasFullLinkAccess ? 'TRSL (dB)' : publicSecondAxisName"
        :bottomRightAxisName="auth.hasFullLinkAccess ? 'Temperature (°C)' : ''" :thirdLeftAxisName="'Rain int. (mm/h)'" />

      <MultiPlot v-else-if="hasAnyPlotSelection && isTempRoute" :seriesData="seriesData" :xMin="start" :xMax="end"
        :cursorTime="currentCursorTime" :topLeftAxisName="'Rainfall (mm)'" :topRightAxisName="'Temperature (°C)'"
        :bottomLeftAxisName="auth.hasFullLinkAccess ? 'TRSL (dB)' : publicSecondAxisName"
        :bottomRightAxisName="auth.hasFullLinkAccess ? 'Temperature (°C)' : ''" :thirdLeftAxisName="'Temperature (°C)'" />
    </div>

    <div class="flex h-8 items-center justify-between gap-2">
      <div class="rounded-md bg-gray-800/50 px-3 py-0.5 text-xs text-white backdrop-blur-xs md:py-1 md:text-sm">
        Links
      </div>

      <div class="flex-1 gap-x-2 overflow-x-auto whitespace-nowrap">
        <div class="flex gap-x-2">
          <button v-for="cmlId in cmlData.cmlIds" :key="cmlId"
            class="inline-block cursor-pointer rounded-md px-3 py-0.5 text-xs font-medium md:py-1 md:text-sm" :class="cmlId === cmlData.selectedCmlId
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              " @click="cmlData.selectCml(cmlId)" @dblclick.stop="cmlData.removeCml(cmlId)">
            {{ cmlId }}
          </button>
        </div>
      </div>

      <button v-if="cmlData.cmlIds.length > 0"
        class="shrink-0 cursor-pointer rounded-md bg-red-600 px-3 py-0.5 text-xs text-white hover:bg-red-700 md:py-1 md:text-sm"
        @click="clearLinks">
        Clear
      </button>
    </div>
  </div>
</template>
