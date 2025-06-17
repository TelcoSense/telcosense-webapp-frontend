<script setup lang="ts">
import { useCmlDataStore } from '@/stores/cmlData'
import { useWeatherDataStore } from '@/stores/weatherData'
import { computed } from 'vue'

import { useActiveLayer } from '@/composables/useActiveLayer'

import MultiPlot from '@/components/MultiPlot.vue'

defineProps<{
  start: string | null
  end: string | null
}>()

const weatherData = useWeatherDataStore()
const cmlData = useCmlDataStore()

const { activeLayer } = useActiveLayer()

const currentCursorTime = computed(() => {
  const frame = activeLayer.value?.frames[activeLayer.value.currentIndex]
  return frame?.timestamp ?? undefined
})

function y(side: 'left' | 'right') {
  return side
}

const seriesData = computed(() => {
  return [
    {
      name: 'WS temperature',
      data: weatherData.currentTemperature,
      subplotIndex: 0,
      yAxisSide: y('left'),
    },
    {
      name: 'WS rainfall',
      data: weatherData.currentPrecipitation,
      subplotIndex: 0,
      yAxisSide: y('right'),
    },
    {
      name: 'CML A temperature',
      data: cmlData.selectedCmlId
        ? (cmlData.cmls.get(cmlData.selectedCmlId)?.temperatureA ?? [])
        : [],
      subplotIndex: 1,
      yAxisSide: y('left'),
    },
    {
      name: 'CML B temperature',
      data: cmlData.selectedCmlId
        ? (cmlData.cmls.get(cmlData.selectedCmlId)?.temperatureB ?? [])
        : [],
      subplotIndex: 1,
      yAxisSide: y('left'),
    },
    {
      name: 'CML A TRSL',
      data: cmlData.selectedCmlId ? (cmlData.cmls.get(cmlData.selectedCmlId)?.trslA ?? []) : [],
      subplotIndex: 1,
      yAxisSide: y('right'),
    },
    {
      name: 'CML B TRSL',
      data: cmlData.selectedCmlId ? (cmlData.cmls.get(cmlData.selectedCmlId)?.trslB ?? []) : [],
      subplotIndex: 1,
      yAxisSide: y('right'),
    },
    {
      name: 'CML rain intensity',
      data: cmlData.selectedCmlId
        ? (cmlData.cmls.get(cmlData.selectedCmlId)?.rainIntensity ?? [])
        : [],
      subplotIndex: 2,
      yAxisSide: y('left'),
    },
  ]
})
</script>

<template>
  <div
    v-if="weatherData.stationIds.length > 0 || cmlData.cmlIds.length > 0"
    class="absolute bottom-33 flex h-[500px] w-[1250px] flex-col gap-2"
  >
    <div class="flex h-8 items-center justify-between gap-2">
      <div class="flex-1 overflow-x-auto whitespace-nowrap">
        <div class="flex gap-x-2">
          <button
            v-for="stationId in weatherData.stationIds"
            :key="stationId"
            @click="weatherData.selectStation(stationId)"
            @dblclick.stop="weatherData.removeStation(stationId)"
            class="inline-block cursor-pointer rounded-md px-4 py-1 text-sm font-medium"
            :class="
              stationId === weatherData.selectedStationId
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            "
          >
            {{ stationId }}
          </button>
        </div>
      </div>
      <button
        v-if="weatherData.stationIds.length > 0"
        @click="weatherData.clear()"
        class="shrink-0 cursor-pointer rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
      >
        Clear
      </button>
    </div>
    <div v-if="start && end" class="flex flex-1 items-center justify-center rounded-md bg-gray-800">
      <div
        v-if="weatherData.loading || cmlData.loading"
        class="animate-pulse text-sm text-gray-300"
      >
        Loading data...
      </div>
      <MultiPlot
        v-else-if="weatherData.selectedStationId || cmlData.selectedCmlId"
        :seriesData="seriesData"
        :xMin="start"
        :xMax="end"
        :cursorTime="currentCursorTime"
        :topLeftAxisName="'Temperature (°C)'"
        :topRightAxisName="'Rainfall (mm)'"
        :bottomLeftAxisName="'Temperature (°C)'"
        :bottomRightAxisName="'TRSL (dB)'"
        :thirdLeftAxisName="'Rain int. (mm/h)'"
      />
    </div>

    <div class="flex h-8 items-center justify-between gap-2">
      <div class="flex-1 gap-x-2 overflow-x-auto whitespace-nowrap">
        <div class="flex gap-x-2">
          <button
            v-for="cmlId in cmlData.cmlIds"
            :key="cmlId"
            @click="cmlData.selectCml(cmlId)"
            @dblclick.stop="cmlData.removeCml(cmlId)"
            class="inline-block cursor-pointer rounded-md px-4 py-1 text-sm font-medium"
            :class="
              cmlId === cmlData.selectedCmlId
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            "
          >
            Link ID: {{ cmlId }}
          </button>
        </div>
      </div>
      <button
        v-if="cmlData.cmlIds.length > 0"
        @click="cmlData.clear()"
        class="shrink-0 cursor-pointer rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
      >
        Clear
      </button>
    </div>
  </div>
</template>
