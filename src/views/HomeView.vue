<script setup lang="ts">
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import Datepicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

import type { ImageSequenceLayer } from '@/composables/useImageSequenceLayer'
import type { Ref } from 'vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import DataPlotting from '@/components/DataPlotting.vue'
import LayerControls from '@/components/LayerControls.vue'
import LayerSwitcher from '@/components/LayerSwitcher.vue'
import LinkFilter from '@/components/LinkFilter.vue'
import LinkTable from '@/components/LinkTable.vue'
import PrecipitationBar from '@/components/PrecipitationBar.vue'
import ReflectivityBar from '@/components/ReflectivityBar.vue'
import TopNavbar from '@/components/TopNavbar.vue'

import { useCmlDataStore } from '@/stores/cmlData'
import { useConfigStore } from '@/stores/config'
import { useLinksStore } from '@/stores/links'
import { useWeatherDataStore } from '@/stores/weatherData'
import { useWeatherStationsStore } from '@/stores/weatherStations'

import { useActiveLayer } from '@/composables/useActiveLayer'
import { useImageLayer } from '@/composables/useImageLayer'
import { useLinkSelection } from '@/composables/useLinkSelection'
import { useRealtime } from '@/composables/useRealtime'
// import { useStationSelection } from '@/composables/useStationSelection'
import { datetimeFormat } from '@/utils'

// realtime composable
const { currentTimestamp, oneWeekAgoTimestamp } = useRealtime(10)

// store definitions
const weatherStations = useWeatherStationsStore()
const weatherData = useWeatherDataStore()
const links = useLinksStore()
const cmlData = useCmlDataStore()
const config = useConfigStore()

// realtime/historic bounds
const start = ref<string | null>('')
const end = ref<string | null>('')

watch(
  () => config.realtime,
  (isRealtime) => {
    if (isRealtime) {
      start.value = oneWeekAgoTimestamp.value
      end.value = currentTimestamp.value
    } else {
      start.value = config.start
      end.value = config.end
    }
  },
  { immediate: true },
)

// map initialization, link and station selection setup
const map = ref<L.Map | null>(null)

const stationsGroup = ref<L.LayerGroup>(L.layerGroup())
const linksGroup = ref<L.LayerGroup>(L.layerGroup())

const linkPolylines = new Map<number, L.Polyline>()
const stationMarkers = new Map<number, L.CircleMarker>()

const selectedLinkIds = ref<Set<number>>(new Set())
const selectedStationIds = ref<Set<number>>(new Set())

const dragBox = ref<HTMLDivElement | null>(null)

const { onMapMouseDown } = useLinkSelection({
  map: map as Ref<L.Map | null>,
  dragBox,
  links,
  selectedLinkIds,
  drawLinks,
})

const selectedStart = ref<Date | null>(null)
const selectedEnd = ref<Date | null>(null)
const timeRangeVisible = ref<boolean>(false)
const dataPlottingVisible = ref<boolean>(true)

function toUtcDate(dateLike: Date | string): Date {
  const localDate = typeof dateLike === 'string' ? new Date(dateLike) : dateLike
  return new Date(
    Date.UTC(
      localDate.getFullYear(),
      localDate.getMonth(),
      localDate.getDate(),
      localDate.getHours(),
      localDate.getMinutes(),
      localDate.getSeconds(),
    ),
  )
}

function applyCustomRange() {
  if (!selectedStart.value || !selectedEnd.value) return

  const startUtc =
    config.datetimeFormat === 'UTC'
      ? toUtcDate(selectedStart.value).toISOString()
      : new Date(selectedStart.value).toISOString()
  const endUtc =
    config.datetimeFormat === 'UTC'
      ? toUtcDate(selectedEnd.value).toISOString()
      : new Date(selectedEnd.value).toISOString()

  // const startUtc = toUtcDate(selectedStart.value).toISOString()
  // const endUtc = toUtcDate(selectedEnd.value).toISOString()

  config.start = startUtc
  config.end = endUtc
  start.value = startUtc
  end.value = endUtc

  // weatherData.clear()
  // cmlData.clear()

  clearLayer()

  maxz.clear()
  merge1h.clear()
  raincz.clear()

  maxz.fetchList(start.value, end.value)
  merge1h.fetchList(start.value, end.value)
  raincz.fetchList(start.value, end.value)

  cmlData.refresh(start.value, end.value)
  weatherData.refresh(start.value, end.value)

  timeRangeVisible.value = false
  dataPlottingVisible.value = true
}

const isTimeRangeValid = computed(() => {
  return (
    selectedStart.value !== null &&
    selectedEnd.value !== null &&
    selectedStart.value < selectedEnd.value
  )
})

// const { onMapMouseDown: onStationMouseDown } = useStationSelection({
//   map: map as Ref<L.Map | null>,
//   dragBox,
//   stations: weatherStations,
//   selectedStationIds,
//   drawStations,
// })

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    selectedLinkIds.value.clear()
    selectedStationIds.value.clear()
    drawLinks()
    drawStations()
  }
}

function initMap() {
  map.value = L.map('map', {
    preferCanvas: true,
    zoomControl: false,
    renderer: L.canvas({ tolerance: 6 }),
  }).setView([49.74379, 15.33863], 8)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map.value as L.Map)
  stationsGroup.value.addTo(map.value as L.Map)
  linksGroup.value.addTo(map.value as L.Map)
}

// map layers setup
const { activeLayer, clearLayer } = useActiveLayer()

const maxz = useImageLayer('maxz', {
  apiUrl: '/maxz/list',
  bounds: L.latLngBounds(L.latLng(48.047, 11.267), L.latLng(51.458, 19.624)),
})

const merge1h = useImageLayer('merge1h', {
  apiUrl: '/merge1h/list',
  bounds: L.latLngBounds([48.047, 11.267], [51.458, 19.624]),
})

const raincz = useImageLayer('raincz', {
  apiUrl: '/raincz/list',
  bounds: L.latLngBounds([48.5525, 12.0905], [51.0557, 18.8591]),
})

async function initLayer(layer: ImageSequenceLayer, map: L.Map, start: string, end: string) {
  layer.releaseBlobs()
  layer.setMap(map)
  await layer.fetchList(start, end)
}

onMounted(async () => {
  initMap()

  start.value = oneWeekAgoTimestamp.value
  end.value = currentTimestamp.value

  weatherStations.fetchWeatherStations()
  await links.fetchLinks()

  dragBox.value = document.getElementById('drag-box') as HTMLDivElement
  const mapObject = map.value as L.Map

  mapObject.on('mousedown', (e: L.LeafletMouseEvent) => {
    onMapMouseDown(e)
    // onStationMouseDown(e)
  })

  window.addEventListener('keydown', onKeyDown)

  await Promise.all([
    initLayer(maxz, mapObject, oneWeekAgoTimestamp.value, currentTimestamp.value),
    initLayer(merge1h, mapObject, oneWeekAgoTimestamp.value, currentTimestamp.value),
    initLayer(raincz, mapObject, oneWeekAgoTimestamp.value, currentTimestamp.value),
  ])
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})

// link and station drawing setup
const tooltipOptions: L.TooltipOptions = {
  offset: [30, 0],
  direction: 'auto',
  permanent: false,
  sticky: false,
  opacity: 1,
}

function drawLinks() {
  const group = linksGroup.value!
  const currentIds = new Set(links.filteredLinks.map((l) => l.id))
  for (const [id, polyline] of linkPolylines.entries()) {
    if (!currentIds.has(id)) {
      group.removeLayer(polyline)
      linkPolylines.delete(id)
    }
  }
  links.filteredLinks.forEach((link) => {
    const isSelected =
      selectedLinkIds.value.has(link.id) || link.id.toString() === cmlData.selectedCmlId
    const color = isSelected ? 'red' : 'black'
    let polyline = linkPolylines.get(link.id)
    if (!polyline) {
      polyline = L.polyline(
        [
          [link.site_A.y, link.site_A.x],
          [link.site_B.y, link.site_B.x],
        ],
        { color, weight: 2 },
      )
      polyline.bindTooltip(
        `<div class="font-inter text-black text-sm">
            <div class="mb-1 border-b font-semibold border-gray-300">Link ID: ${link.id}</div>
            <div>
              Site A: ${link.site_A.name}<br />
              Site B: ${link.site_B.name}<br />
              IP A: ${link.ip_address_A}<br />
              IP B: ${link.ip_address_B}<br />
              Frequency A: ${(link.frequency_A / 1000).toFixed(2)} GHz<br />
              Frequency B: ${(link.frequency_B / 1000).toFixed(2)} GHz<br />
              Length: ${link.length} m<br />
              Polarization: ${link.polarization}<br />
              Tech: ${link.technology}<br />
            </div>
          </div>`,
        tooltipOptions,
      )
      polyline.on('click', async () => {
        polyline?.setTooltipContent('')
        cmlData.fetchCmlData(
          start.value,
          end.value,
          String(link.id),
          link.ip_address_A,
          link.ip_address_B,
          link.influx_mapping,
        )
      })
      polyline.addTo(group as L.LayerGroup)
      linkPolylines.set(link.id, polyline)
    } else {
      polyline.setStyle({ color })
    }
  })
}

function drawStations() {
  const group = stationsGroup.value!
  const currentIds = new Set(weatherStations.filteredStations.map((ws) => ws.id))
  for (const [id, marker] of stationMarkers.entries()) {
    if (!currentIds.has(id)) {
      group.removeLayer(marker)
      stationMarkers.delete(id)
    }
  }
  weatherStations.filteredStations.forEach((ws) => {
    const isSelected =
      selectedStationIds.value.has(ws.id) || ws.gh_id === weatherData.selectedStationId
    const hasTemperature = ws.measurements.includes('T')
    const hasPrecipitation = ws.measurements.includes('SRA10M')

    let color = 'gray'
    if (isSelected) {
      color = 'red'
    } else if (hasTemperature && hasPrecipitation) {
      color = 'purple'
    } else if (hasTemperature) {
      color = 'orange'
    } else if (hasPrecipitation) {
      color = 'blue'
    }

    let marker = stationMarkers.get(ws.id)
    if (!marker) {
      marker = L.circleMarker([ws.Y, ws.X], {
        radius: 5,
        color,
        fillColor: color,
        fillOpacity: 0.5,
        weight: 0.5,
      })
      marker.bindTooltip(
        `<div class="font-inter text-black text-sm">
            <div class="mb-1 border-b border-gray-300 font-semibold">${ws.full_name}</div>
            <div>
              GH ID: ${ws.gh_id}<br/>
              WSI: ${ws.wsi}<br/>
              Lat: ${ws.Y}, Lon: ${ws.X}<br/>
              Elevation: ${ws.elevation} m
            </div>
          </div>`,
        tooltipOptions,
      )
      marker.on('click', async () => {
        const ghId = ws.gh_id
        marker?.setTooltipContent('')
        await weatherData.fetchStationData(start.value, end.value, ghId)
      })
      marker.addTo(group as L.LayerGroup)
      stationMarkers.set(ws.id, marker)
    } else {
      marker.setStyle({ color, fillColor: color })
    }
  })
}

// watchers for the filtered links and stations drawing
watch(
  () => links.filteredLinks,
  () => {
    if (links.hasLinks) {
      drawLinks()
    }
  },
)

watch(
  () => weatherStations.filteredStations,
  () => {
    if (weatherStations.hasStations) {
      drawStations()
    }
  },
)

watch(
  () => weatherData.selectedStationId,
  () => {
    drawStations()
  },
)

watch(
  () => cmlData.selectedCmlId,
  () => {
    drawLinks()
  },
)

// watcher for historic/realtime switching
watch(
  () => config.realtime,
  (newVal) => {
    if (newVal) {
      dataPlottingVisible.value = true

      if (start.value && end.value) {
        cmlData.refresh(start.value, end.value)
        weatherData.refresh(start.value, end.value)
      }
      clearLayer()
      maxz.clear()
      merge1h.clear()
      raincz.clear()

      maxz.fetchList(start.value, end.value)
      merge1h.fetchList(start.value, end.value)
      raincz.fetchList(start.value, end.value)
    } else {
      // do something when switching to historic calcs
      dataPlottingVisible.value = false

      clearLayer()

      if (start.value && end.value) {
        cmlData.refresh(start.value, end.value)
        weatherData.refresh(start.value, end.value)
      }

      maxz.clear()
      merge1h.clear()
      raincz.clear()

      // weatherData.clear()
      // cmlData.clear()
    }
  },
)

function formatDateForDatepicker(date: Date): string {
  return datetimeFormat(date.toISOString(), 'Europe/Prague')
}
</script>

<template>
  <div class="font-inter min-h-screen">
    <main class="h-[calc(100vh)]">
      <div class="relative flex h-full w-full flex-row items-center justify-center">
        <div id="map" class="leaflet-container z-0 h-full w-full"></div>

        <div
          v-if="start && end"
          id="timestamps"
          class="absolute right-6 bottom-6 z-10 flex flex-col rounded-md bg-gray-800 p-2 text-sm text-white select-none"
        >
          <p v-if="config.realtime" class="border-b border-gray-700">Realtime bounds</p>
          <p v-if="!config.realtime" class="border-b border-gray-700">Historic bounds</p>
          <p v-if="start">
            Start:
            <span class="font-chivo">{{ datetimeFormat(start, config.datetimeFormat) }} </span>
          </p>
          <p v-if="end">
            End:
            <span class="font-chivo">{{ datetimeFormat(end, config.datetimeFormat) }} </span>
          </p>
          <!-- <p>
              Next update in: <span class="font-chivo">{{ formattedCountdown }}</span>
            </p> -->
        </div>

        <div
          id="drag-box"
          class="pointer-events-none absolute z-40 hidden border-1 border-blue-400 bg-blue-400/10"
        ></div>

        <TopNavbar>
          <div class="mr-32 flex gap-x-3">
            <button
              :class="[
                'h-8 cursor-pointer rounded-md px-3 text-gray-300',
                config.realtime
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-700 hover:bg-gray-600',
              ]"
              @click="config.setToRealtime()"
            >
              Realtime data
            </button>

            <button
              :class="[
                'h-8 cursor-pointer rounded-md px-3 text-gray-300',
                !config.realtime
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-700 hover:bg-gray-600',
              ]"
              @click="config.setToHistoric()"
            >
              Historic data
            </button>
          </div>
          <button
            v-if="weatherStations.hasStations"
            class="h-8 cursor-pointer rounded-md border bg-amber-200 px-3 hover:bg-amber-300"
            :class="{ 'bg-amber-300': !weatherStations.hideAll }"
            @click="weatherStations.hideAll = !weatherStations.hideAll"
          >
            Stations
          </button>
          <button
            v-if="links.hasLinks"
            class="h-8 cursor-pointer rounded-md border bg-amber-200 px-3 hover:bg-amber-300"
            :class="{ 'bg-amber-300': !links.hideAll }"
            @click="links.hideAll = !links.hideAll"
          >
            Links
          </button>
        </TopNavbar>

        <LinkFilter />
        <LayerControls />
        <LayerSwitcher />

        <PrecipitationBar v-if="activeLayer?.name == 'merge1h'" />
        <ReflectivityBar v-if="activeLayer?.name == 'maxz' || activeLayer?.name == 'raincz'" />

        <DataPlotting v-show="dataPlottingVisible" :start="start" :end="end" />

        <LinkTable v-show="links.showLinkTable && links.linkFilterVisible" />

        <!-- timerange -->
        <div
          v-if="!config.realtime && timeRangeVisible"
          class="absolute top-20 left-62 z-30 w-80 rounded-md bg-gray-800 p-3"
        >
          <div class="flex w-full justify-end text-sm">
            <button
              @click="timeRangeVisible = false"
              class="cursor-pointer rounded bg-gray-600 px-3 py-1 text-white hover:bg-gray-500 hover:opacity-100"
            >
              Close
            </button>
          </div>
          <label class="mb-1 block text-sm text-white">Start</label>
          <Datepicker
            v-model="selectedStart"
            utc
            time-picker-inline
            model-type="date"
            :max-date="new Date()"
            class="mb-3 w-full text-sm"
            dark
            :format="formatDateForDatepicker"
          />

          <label class="mb-1 block text-sm text-white">End</label>
          <Datepicker
            v-model="selectedEnd"
            utc
            time-picker-inline
            model-type="date"
            :max-date="new Date()"
            class="mb-4 w-full text-sm"
            dark
            :format="formatDateForDatepicker"
          />

          <button
            class="w-full rounded bg-blue-600 py-1 text-sm text-white hover:bg-blue-700 enabled:cursor-pointer disabled:bg-gray-700 disabled:text-gray-500"
            :disabled="!isTimeRangeValid"
            @click="applyCustomRange"
          >
            Apply time range
          </button>
        </div>
        <div v-else class="absolute top-20 left-62 z-30 text-sm">
          <button
            v-show="!config.realtime"
            @click="timeRangeVisible = true"
            class="cursor-pointer rounded bg-gray-600 px-3 py-1 text-white hover:bg-gray-500 hover:opacity-100"
          >
            Select time range
          </button>
        </div>
        <!-- timerange end-->
      </div>
    </main>
  </div>
</template>

<style>
.leaflet-image-layer {
  image-rendering: pixelated !important;
}

.dp__theme_light,
.dp__theme_dark {
  --dp-font-size: 0.875rem;
  --dp-font-family: 'Inter', sans-serif;
  --dp-background-color: #1f2937;
  --dp-text-color: #ffffff;
  --dp-hover-color: #374151;
  --dp-primary-color: #2563eb;
  --dp-border-color: #374151;
  --dp-menu-border-color: #374151;
  --dp-inner-border-color: #374151;
  --dp-hover-text-color: #ffffff;
}
</style>
