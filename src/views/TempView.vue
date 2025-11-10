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
import LeftMenu from '@/components/LeftMenu.vue'
import LinkFilter from '@/components/LinkFilter.vue'
import LinkTable from '@/components/LinkTable.vue'
import PrecipitationBar from '@/components/PrecipitationBar.vue'
import RainHistoric from '@/components/RainHistoric.vue'
import ReflectivityBar from '@/components/ReflectivityBar.vue'
import TopNavbar from '@/components/TopNavbar.vue'

import { useCmlDataStore } from '@/stores/cmlData'
import { useConfigStore } from '@/stores/config'
import { useLayersStore } from '@/stores/layers'
import { useLinksStore } from '@/stores/links'
import { useWeatherDataStore } from '@/stores/weatherData'
import { useWeatherStationsStore } from '@/stores/weatherStations'

import { useActiveLayer } from '@/composables/useActiveLayer'
import { useLinkSelection } from '@/composables/useLinkSelection'
import { useMap } from '@/composables/useMap'
import { useRealtime } from '@/composables/useRealtime'
import { datetimeFormat, toUtcDate } from '@/utils'
// import { useStationSelection } from '@/composables/useStationSelection'

// TODO: playback speed, select proper time range for the rest of the layers when using user calculation
// when deleting selected calc check if it isnt selected

// realtime composable
const { currentTimestamp, oneWeekAgoTimestamp } = useRealtime(10)
const { map } = useMap()

// store definitions
const weatherStations = useWeatherStationsStore()
const weatherData = useWeatherDataStore()
const links = useLinksStore()
const cmlData = useCmlDataStore()
const config = useConfigStore()
const layers = useLayersStore()

// realtime/historic bounds
// const start = ref<string | null>('')
// const end = ref<string | null>('')

watch(
  () => config.realtime,
  (isRealtime) => {
    if (isRealtime) {
      config.start = oneWeekAgoTimestamp.value
      config.end = currentTimestamp.value
    } else {
      config.start = null
      config.end = null
    }
  },
  { immediate: true },
)

watch([currentTimestamp, oneWeekAgoTimestamp], ([end, start]) => {
  if (config.realtime) {
    config.start = start
    config.end = end
  }
})

// map initialization, link and station selection setup
// const map = ref<L.Map | null>(null)

const stationsGroup = ref<L.LayerGroup>(L.layerGroup())
const linksGroup = ref<L.LayerGroup>(L.layerGroup())

const linkPolylines = new Map<number, L.Polyline>()
const stationMarkers = new Map<number, L.CircleMarker>()

const selectedLinkIds = ref<Set<number>>(new Set())
const selectedStationIds = ref<Set<number>>(new Set())

const dragBox = ref<HTMLDivElement | null>(null)

const { onMapMouseDown, selectionInProgress } = useLinkSelection({
  map: map as Ref<L.Map | null>,
  dragBox,
  links,
  selectedLinkIds,
  drawLinks,
})

const selectedStart = ref<Date | null>(null)
const selectedEnd = ref<Date | null>(null)
const timeRangeVisible = ref<boolean>(false)

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
  // start.value = startUtc
  // end.value = endUtc

  // weatherData.clear()
  // cmlData.clear()

  clearLayer()

  layers.maxz.clear()
  layers.merge1h.clear()
  layers.raincz.clear()
  layers.userCalc.clear()

  layers.maxz.fetchList(config.start, config.end)
  layers.merge1h.fetchList(config.start, config.end)
  layers.raincz.fetchList(config.start, config.end)

  cmlData.refresh(config.start, config.end)
  weatherData.refresh(config.start, config.end)

  timeRangeVisible.value = false
  config.dataPlottingVisible = true
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
  const isMobile = window.innerWidth <= 768
  const zoom = isMobile ? 6 : 8
  map.value = L.map('map', {
    preferCanvas: true,
    zoomControl: false,
    renderer: L.canvas({ tolerance: 6 }),
  }).setView([49.74379, 15.33863], zoom)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    detectRetina: true,
  }).addTo(map.value as L.Map)
  stationsGroup.value.addTo(map.value as L.Map)
  linksGroup.value.addTo(map.value as L.Map)
}

// map layers setup
const { activeLayer, clearLayer } = useActiveLayer()

async function initLayer(
  layer: ImageSequenceLayer,
  map: L.Map,
  start: string,
  end: string,
  fetch: boolean = true,
) {
  layer.releaseBlobs()
  layer.setMap(map)

  if (fetch) await layer.fetchList(start, end)
}

onMounted(async () => {
  initMap()

  config.start = oneWeekAgoTimestamp.value
  config.end = currentTimestamp.value

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
    initLayer(layers.tempcz, mapObject, oneWeekAgoTimestamp.value, currentTimestamp.value),
    initLayer(layers.tempchmi, mapObject, oneWeekAgoTimestamp.value, currentTimestamp.value),
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
        if (selectionInProgress.value) return
        polyline?.setTooltipContent('')
        cmlData.fetchCmlData(
          config.start,
          config.end,
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
        radius: 3.5,
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
        if (selectionInProgress.value) return
        const ghId = ws.gh_id
        marker?.setTooltipContent('')
        await weatherData.fetchStationData(config.start, config.end, ghId)
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
// watch(
//   () => config.realtime,
//   (newVal) => {
//     if (newVal) {
//       config.dataPlottingVisible = true

//       if (config.start && config.end) {
//         cmlData.refresh(config.start, config.end)
//         weatherData.refresh(config.start, config.end)
//       }
//       clearLayer()
//       layers.maxz.clear()
//       layers.merge1h.clear()
//       layers.raincz.clear()

//       layers.maxz.fetchList(config.start, config.end)
//       layers.merge1h.fetchList(config.start, config.end)
//       layers.raincz.fetchList(config.start, config.end)
//     } else {
//       // do something when switching to historic calcs
//       config.dataPlottingVisible = false

//       clearLayer()

//       if (config.start && config.end) {
//         cmlData.refresh(config.start, config.end)
//         weatherData.refresh(config.start, config.end)
//       }

//       layers.maxz.clear()
//       layers.merge1h.clear()
//       layers.raincz.clear()
//       layers.userCalc.clear()

//       // weatherData.clear()
//       // cmlData.clear()
//     }
//   },
// )

function formatDateForDatepicker(date: Date): string {
  return datetimeFormat(date.toISOString(), 'Europe/Prague')
}

async function copySelectedLinksToClipboard() {
  if (selectedLinkIds.value.size === 0) {
    // console.warn("No links selected")
    return
  }
  const text = Array.from(selectedLinkIds.value).join(', ')
  try {
    await navigator.clipboard.writeText(text)
    // console.log("Copied:", text)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}
</script>

<template>
  <div class="font-inter min-h-[100svh]">
    <main class="h-[100svh]">
      <div class="relative flex h-full w-full flex-row items-center justify-center">
        <div id="map" class="leaflet-container z-0 h-full w-full"></div>

        <div v-if="config.start && config.end" id="timestamps"
          class="absolute right-3 bottom-32 z-10 hidden flex-col rounded-md border border-gray-600 bg-gray-800/60 p-1 text-sm text-white backdrop-blur-xs select-none md:visible md:bottom-3 md:flex">
          <p v-if="config.realtime">Realtime bounds</p>
          <p v-if="!config.realtime">Historic bounds</p>
          <p v-if="config.start">
            Start:
            <span class="font-chivo">{{ datetimeFormat(config.start, config.datetimeFormat) }}
            </span>
          </p>
          <p v-if="config.end">
            End:
            <span class="font-chivo">{{ datetimeFormat(config.end, config.datetimeFormat) }} </span>
          </p>
          <!-- <p>
              Next update in: <span class="font-chivo">{{ formattedCountdown }}</span>
            </p> -->
        </div>

        <div id="drag-box" class="pointer-events-none absolute z-40 hidden border-1 border-blue-400 bg-blue-400/10">
        </div>

        <TopNavbar>
          <!-- <div class="mr-32 flex gap-x-3">
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
          </div> -->
          <button v-if="links.hasLinks"
            class="hidden h-8 rounded-md border border-black bg-amber-200 px-3 hover:bg-amber-300 enabled:cursor-pointer disabled:opacity-50 disabled:hover:bg-amber-200 md:block"
            :disabled="selectedLinkIds.size === 0" @click="copySelectedLinksToClipboard">
            Copy link IDs
          </button>
        </TopNavbar>

        <LeftMenu />
        <LinkFilter />
        <LayerControls />
        <LayerSwitcher v-if="config.layerSwitcherVisible" />

        <PrecipitationBar v-if="activeLayer?.name == 'merge1h'" />
        <ReflectivityBar v-if="
          activeLayer?.name == 'maxz' ||
          activeLayer?.name == 'raincz' ||
          activeLayer?.name == 'user-calc'
        " />

        <DataPlotting v-show="config.dataPlottingVisible" :start="config.start" :end="config.end" />
        <LinkTable v-show="links.showLinkTable && links.linkFilterVisible" />
        <RainHistoric :link-ids="selectedLinkIds" />

        <!-- timerange -->
        <div v-if="!config.realtime && timeRangeVisible"
          class="absolute top-20 left-46 z-30 w-64 rounded-md bg-gray-800 p-3">
          <div class="flex w-full justify-end text-sm">
            <button @click="timeRangeVisible = false"
              class="cursor-pointer rounded bg-gray-600 px-3 py-1 text-white hover:bg-gray-500 hover:opacity-100">
              Close
            </button>
          </div>
          <label class="mb-1 block text-sm text-white">Start</label>
          <Datepicker v-model="selectedStart" utc time-picker-inline model-type="date" :max-date="new Date()"
            class="mb-3 w-full text-sm" dark :format="formatDateForDatepicker" :timezone="config.datetimeFormat" />

          <label class="mb-1 block text-sm text-white">End</label>
          <Datepicker v-model="selectedEnd" utc time-picker-inline model-type="date" :max-date="new Date()"
            class="mb-4 w-full text-sm" dark :format="formatDateForDatepicker" :timezone="config.datetimeFormat" />

          <button
            class="w-full rounded bg-blue-600 py-1 text-sm text-white hover:bg-blue-700 enabled:cursor-pointer disabled:bg-gray-700 disabled:text-gray-500"
            :disabled="!isTimeRangeValid" @click="applyCustomRange">
            Apply time range
          </button>
        </div>
        <div v-else class="absolute top-20 left-46 z-30 text-sm">
          <button v-show="!config.realtime" @click="timeRangeVisible = true"
            class="cursor-pointer rounded bg-gray-600 px-3 py-1 text-white hover:bg-gray-500 hover:opacity-100">
            Previous realtime data
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

.dp__theme_light .dp__calendar_header,
.dp__theme_dark .dp__calendar_header {
  font-weight: 500;
}
</style>
