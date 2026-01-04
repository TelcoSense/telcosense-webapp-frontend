<script setup lang="ts">
import L from 'leaflet'
import 'leaflet.markercluster/dist/leaflet.markercluster.js'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet/dist/leaflet.css'

import { Icon } from '@iconify/vue'
import Datepicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

import type { ImageSequenceLayer } from '@/composables/useImageSequenceLayer'
import { onClickOutside } from '@vueuse/core'
import type { Ref } from 'vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'

import DataPlotting from '@/components/DataPlotting.vue'
import LayerControls from '@/components/LayerControls.vue'
import LayerSwitcher from '@/components/LayerSwitcher.vue'
import LeftMenu from '@/components/LeftMenu.vue'
import LinkFilter from '@/components/LinkFilter.vue'
import LinkTable from '@/components/LinkTable.vue'
import PrecipitationBar from '@/components/PrecipitationBar.vue'
import RainHistoric from '@/components/RainHistoric.vue'
import ReflectivityBar from '@/components/ReflectivityBar.vue'
import RightMenu from '@/components/RightMenu.vue'
import TopNavbar from '@/components/TopNavbar.vue'

import { useCmlDataStore } from '@/stores/cmlData'
import { useConfigStore } from '@/stores/config'
import { useDeviceStore } from '@/stores/device'
import { useLayersStore } from '@/stores/layers'
import { useLinksStore } from '@/stores/links'
import { useWeatherDataStore } from '@/stores/weatherData'
import { useWeatherStationsStore } from '@/stores/weatherStations'

import { useActiveLayer } from '@/composables/useActiveLayer'
import { useLinkSelection } from '@/composables/useLinkSelection'
import { useMap } from '@/composables/useMap'
import { useRealtime } from '@/composables/useRealtime'
import { datetimeFormat, toUtcDate } from '@/utils'


// realtime composable
const { currentTimestamp, oneWeekAgoTimestamp } = useRealtime(10)
const { map, secondaryMap } = useMap()

// store definitions
const weatherStations = useWeatherStationsStore()
const weatherData = useWeatherDataStore()
const links = useLinksStore()
const cmlData = useCmlDataStore()
const config = useConfigStore()
const layers = useLayersStore()
const device = useDeviceStore()

function syncPrimaryToSecondarySmooth(src: L.Map, dst: L.Map, isEnabled: () => boolean) {
  const sync = () => {
    if (!isEnabled()) return
    dst.setView(src.getCenter(), src.getZoom(), { animate: false })
  }

  src.on('moveend', sync)  // fires after drag ends
  src.on('zoomend', sync)  // fires after zoom ends

  // return cleanup
  return () => {
    src.off('moveend', sync)
    src.off('zoomend', sync)
  }
}

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


const {
  activeLayerMain,
  activeLayerSecondary
} = useActiveLayer()


const showHistoric = ref<boolean>(false)

const stationsGroupMain = ref<L.LayerGroup>(L.layerGroup())
const linksGroupMain = ref<L.LayerGroup>(L.layerGroup())

const stationsGroupSecondary = ref<L.LayerGroup>(L.layerGroup())
const linksGroupSecondary = ref<L.LayerGroup>(L.layerGroup())

const linkPolylinesMain = new Map<number, L.Polyline>()
const linkPolylinesSecondary = new Map<number, L.Polyline>()

const stationMarkersMain = new Map<number, L.CircleMarker>()
const stationMarkersSecondary = new Map<number, L.CircleMarker>()

const selectedLinkIds = ref<Set<number>>(new Set())
const selectedStationIds = ref<Set<number>>(new Set())

const dragBox = ref<HTMLDivElement | null>(null)

const clusterGroup = ref<L.LayerGroup>(L.layerGroup())
const clusterMarkers = new Map<number, L.CircleMarker>()


const { onMapMouseDown, selectionInProgress } = useLinkSelection({
  map: map as Ref<L.Map | null>,
  dragBox,
  links,
  selectedLinkIds,
  drawLinks,
})

const selectedStart = ref<Date | null>(null)
const selectedEnd = ref<Date | null>(null)

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

  config.start = startUtc
  config.end = endUtc

  clearMainLayer()
  if (config.splitView) {
    clearSecondaryLayer()
  }

  layers.clearRainLayers()
  layers.fetchListRain(config.start, config.end, config.splitView)

  cmlData.refresh(config.start, config.end)
  weatherData.refresh(config.start, config.end)

  config.datetimeSelectorVisible = false
  config.dataPlottingVisible = true
}

const isTimeRangeValid = computed(() => {
  return (
    selectedStart.value !== null &&
    selectedEnd.value !== null &&
    selectedStart.value < selectedEnd.value
  )
})

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    selectedLinkIds.value.clear()
    selectedStationIds.value.clear()
    drawLinks()
    drawStations()
  }
}

function initMap() {
  const zoom = device.isMobile ? 6 : 8
  map.value = L.map('map', {
    preferCanvas: true,
    zoomControl: false,
    renderer: L.canvas({ tolerance: 6 }),
  }).setView([49.74379, 15.33863], zoom)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    detectRetina: true,
  }).addTo(map.value as L.Map)
  // dirty hack because of the missing types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clusterGroup.value = (L as any).markerClusterGroup({
    maxClusterRadius: 75,
    disableClusteringAtZoom: 13,
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
  })
  clusterGroup.value.addTo(map.value as L.Map)
  stationsGroupMain.value.addTo(map.value as L.Map)
  linksGroupMain.value.addTo(map.value as L.Map)
}

function initSecondaryMap() {
  const zoom = device.isMobile ? 6 : 8
  secondaryMap.value = L.map('secondary-map', {
    preferCanvas: true,
    zoomControl: false,
    renderer: L.canvas({ tolerance: 6 }),
  }).setView([49.74379, 15.33863], zoom)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    detectRetina: true,
  }).addTo(secondaryMap.value as L.Map)
  stationsGroupSecondary.value.addTo(secondaryMap.value as L.Map)
  linksGroupSecondary.value.addTo(secondaryMap.value as L.Map)
}

// map layers setup
const {
  clearMainLayer,
  clearSecondaryLayer,
} = useActiveLayer()


async function initLayer(
  layer: ImageSequenceLayer,
  map: L.Map,
  start: string,
  end: string,
  fetch = true,
) {
  layer.releaseBlobs()
  layer.setMap(map)
  if (fetch) await layer.fetchList(start, end)
}

let stopSync: null | (() => void) = null

onMounted(async () => {
  initMap()
  initSecondaryMap()

  await nextTick()
  stopSync = syncPrimaryToSecondarySmooth(
    map.value as L.Map,
    secondaryMap.value as L.Map,
    () => config.splitView
  )

  config.start = oneWeekAgoTimestamp.value
  config.end = currentTimestamp.value

  weatherStations.fetchWeatherStations()
  await links.fetchLinks()

  dragBox.value = document.getElementById('drag-box') as HTMLDivElement
  const mapObject = map.value as L.Map
  const mapObjectSecondary = secondaryMap.value as L.Map

  mapObject.on('mousedown', (e: L.LeafletMouseEvent) => {
    onMapMouseDown(e)
  })

  window.addEventListener('keydown', onKeyDown)

  await Promise.all([
    initLayer(layers.maxz, mapObject, oneWeekAgoTimestamp.value, currentTimestamp.value, true),
    initLayer(layers.merge1h, mapObject, oneWeekAgoTimestamp.value, currentTimestamp.value, true),
    initLayer(layers.raincz, mapObject, oneWeekAgoTimestamp.value, currentTimestamp.value, true),
    initLayer(layers.userCalc, mapObject, oneWeekAgoTimestamp.value, currentTimestamp.value, false),

    initLayer(layers.maxzSecondary, mapObjectSecondary, oneWeekAgoTimestamp.value, currentTimestamp.value, false),
    initLayer(layers.merge1hSecondary, mapObjectSecondary, oneWeekAgoTimestamp.value, currentTimestamp.value, false),
    initLayer(layers.rainczSecondary, mapObjectSecondary, oneWeekAgoTimestamp.value, currentTimestamp.value, false),
  ])
})

onBeforeUnmount(() => {
  stopSync?.()
  stopSync = null
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

function drawLinksTo(group: L.LayerGroup, store: Map<number, L.Polyline>) {
  const currentIds = new Set(links.filteredLinks.map((l) => l.id))

  // remove deleted
  for (const [id, poly] of store.entries()) {
    if (!currentIds.has(id)) {
      group.removeLayer(poly)
      store.delete(id)
    }
  }

  links.filteredLinks.forEach((link) => {
    const isSelected =
      selectedLinkIds.value.has(link.id) ||
      link.id.toString() === cmlData.selectedCmlId

    const color = isSelected ? 'red' : 'black'

    let polyline = store.get(link.id)

    if (!polyline) {
      polyline = L.polyline(
        [
          [link.site_A.y, link.site_A.x],
          [link.site_B.y, link.site_B.x],
        ],
        { color, weight: 2 },
      )
      const tooltipFontsize = device.isMobile ? 'text-xs' : 'text-sm';
      polyline.bindTooltip(
        `<div class="font-inter text-black ${tooltipFontsize}">
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
        config.dataPlottingVisible = true
        cmlData.fetchCmlData(
          config.start,
          config.end,
          String(link.id),
          link.ip_address_A,
          link.ip_address_B,
          link.influx_mapping,
        )
      })

      group.addLayer(polyline)
      store.set(link.id, polyline)
    } else {
      polyline.setStyle({ color })
    }
  })
}

function drawLinks() {
  drawLinksTo(linksGroupMain.value as L.LayerGroup, linkPolylinesMain)
  drawLinksTo(linksGroupSecondary.value as L.LayerGroup, linkPolylinesSecondary)
}

function drawStationsTo(group: L.LayerGroup, store: Map<number, L.CircleMarker>) {
  const currentIds = new Set(weatherStations.filteredStations.map((ws) => ws.id))

  // remove deleted
  for (const [id, marker] of store.entries()) {
    if (!currentIds.has(id)) {
      group.removeLayer(marker)
      store.delete(id)
    }
  }

  weatherStations.filteredStations.forEach((ws) => {
    const isSelected =
      selectedStationIds.value.has(ws.id) ||
      ws.gh_id === weatherData.selectedStationId

    const hasTemperature = ws.measurements.includes('T')
    const hasPrecipitation = ws.measurements.includes('SRA10M')

    let color = 'gray'
    if (isSelected) color = 'red'
    else if (hasTemperature && hasPrecipitation) color = 'purple'
    else if (hasTemperature) color = 'orange'
    else if (hasPrecipitation) color = 'blue'

    let marker = store.get(ws.id)

    if (!marker) {
      marker = L.circleMarker([ws.Y, ws.X], {
        radius: 3.5,
        color,
        fillColor: color,
        fillOpacity: 0.5,
        weight: 0.5,
      })

      const tooltipFontsize = device.isMobile ? 'text-xs' : 'text-sm';
      marker.bindTooltip(
        `<div class="font-inter text-black ${tooltipFontsize}">
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
        weatherData.fetchStationData(config.start, config.end, ws.gh_id)
        config.dataPlottingVisible = true
      })

      group.addLayer(marker)
      store.set(ws.id, marker)
    } else {
      marker.setStyle({ color, fillColor: color })
    }
  })
}

function rebuildLinksCluster(
  cluster: L.LayerGroup,
  store: Map<number, L.CircleMarker>
) {
  cluster.clearLayers()
  store.clear()
  links.links.forEach((link) => {
    const color = 'transparent'
    const marker = L.circleMarker(
      [link.center_y, link.center_x],
      {
        radius: 3.5,
        color,
        fillColor: color,
      }
    )
    cluster.addLayer(marker)
    store.set(link.id, marker)
  })
}

function clearLinksCluster(
  cluster: L.LayerGroup,
  store: Map<number, L.CircleMarker>
) {
  cluster.clearLayers()
  store.clear()
}

function toggleLinksCluster(
  cluster: L.LayerGroup | null,
  store: Map<number, L.CircleMarker>
) {
  if (!cluster) return
  config.clustersVisible = !config.clustersVisible;
  if (config.clustersVisible) {
    rebuildLinksCluster(cluster, store)
  } else {
    clearLinksCluster(cluster, store)
  }
}

function drawStations() {
  drawStationsTo(stationsGroupMain.value as L.LayerGroup, stationMarkersMain)
  drawStationsTo(stationsGroupSecondary.value as L.LayerGroup, stationMarkersSecondary)
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
    config.dataPlottingVisible = true
    cmlData.clear()
    weatherData.clear()

    if (config.start && config.end) {
      cmlData.refresh(config.start, config.end)
      weatherData.refresh(config.start, config.end)
    }
    clearMainLayer()
    if (config.splitView) {
      clearSecondaryLayer()
      layers.clearRainLayers(true)
    }
    layers.clearRainLayers()
    // for realtime fetch the frames from the realtime window
    if (newVal) layers.fetchListRain(config.start, config.end, config.splitView)
  }
)

function formatDateForDatepicker(date: Date): string {
  return datetimeFormat(date.toISOString(), 'Europe/Prague')
}

async function copySelectedLinksToClipboard() {
  if (selectedLinkIds.value.size === 0) {
    return
  }
  const text = Array.from(selectedLinkIds.value).join(', ')
  try {
    await navigator.clipboard.writeText(text)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

watch(
  () => config.splitView,
  (enabled) => {
    if (enabled && !secondaryMap.value) {
      initSecondaryMap()
    }

    nextTick(() => {
      map.value?.invalidateSize()
      if (enabled) {
        secondaryMap.value?.invalidateSize()
        layers.fetchListRainSecondary(config.start, config.end)
      }
    })
    if (!enabled) {
      clearSecondaryLayer()
    }
  }
)

watch(
  () => config.followPrimary,
  (enabled) => {
    if (enabled) {
      if (map.value && secondaryMap.value && !stopSync) {
        stopSync = syncPrimaryToSecondarySmooth(
          map.value as L.Map,
          secondaryMap.value as L.Map,
          () => config.splitView
        )
      }
    }
    else {
      stopSync?.()
      stopSync = null
    }
  }
)

// on click outsides
// layer switchers
const layerSwitcherMain = useTemplateRef<HTMLElement>('layerSwitcherMain')
onClickOutside(layerSwitcherMain, () => {
  config.mainLayerSwitcherVisible = false
}, { ignore: ['#layer-button-main'] })

const layerSwitcherSecondary = useTemplateRef<HTMLElement>('layerSwitcherSecondary')
onClickOutside(layerSwitcherSecondary, () => {
  config.secondaryLayerSwitcherVisible = false
}, { ignore: ['#layer-button-secondary'] })

// link filter
const linkFilter = useTemplateRef<HTMLElement>('linkFilter')
onClickOutside(linkFilter, () => {
  config.linkFilterVisible = false
}, { ignore: ['#link-filter-button', '#table-button-close'] })

// datetime selector
const datetimeSelector = useTemplateRef<HTMLElement>('datetimeSelector')
onClickOutside(datetimeSelector, () => {
  config.datetimeSelectorVisible = false
}, { ignore: ['#time-range-button'] })

// user calculations
const userCalculations = useTemplateRef<HTMLElement>('userCalculations')
onClickOutside(userCalculations, () => {
  showHistoric.value = false
}, { ignore: ['#user-calc-button'] })


</script>

<template>
  <div class="font-inter min-h-[100svh]">
    <main class="h-[100svh]">
      <div class="relative flex h-full w-full flex-row items-center justify-center">
        <div class="flex h-full w-full">
          <!-- primary map -->
          <div :class="config.splitView ? 'w-1/2 border-r' : 'w-full'">
            <div id="map" class="leaflet-container h-full z-0"></div>
          </div>
          <div v-show="config.splitView" class="relative w-1/2">
            <div id="secondary-map" class="leaflet-container h-full z-0 border-l-1"></div>
            <!-- interaction blocker + label -->
            <div v-if="config.followPrimary" class="absolute inset-0 z-10 p-3 flex items-end">

              <div class="blurred-bg rounded-md border border-gray-600 p-1 text-sm text-white">
                <span class="select-none">Interaction disabled</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="config.start && config.end" id="timestamps"
          class="absolute right-3 bottom-32 z-10 hidden flex-col rounded-md border border-gray-600 p-1 text-sm text-white blurred-bg select-none md:visible md:bottom-3 md:flex">
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
          <div class="mr-32 hidden gap-x-2 md:flex">
            <div class="cursor-pointer rounded-md h-8 text-white ">
              <button class="h-full menu-btn-top rounded-l-md border-r border-y border-gray-600"
                @click="config.setToRealtime()" :class="{ active: config.realtime }">
                Realtime
              </button>

              <button class="h-full menu-btn-top rounded-r-md border-y border-r border-gray-600"
                @click="config.setToHistoric()" :class="{ active: !config.realtime }">
                Historic
              </button>
            </div>

            <button v-if="!config.realtime" id="time-range-button"
              class="h-full menu-btn-top rounded-md border border-gray-600"
              @click="config.datetimeSelectorVisible = !config.datetimeSelectorVisible"
              :class="{ active: config.datetimeSelectorVisible }">
              Time range
            </button>

            <button v-if="!config.realtime" id="user-calc-button"
              class="h-full menu-btn-top rounded-md border border-gray-600" @click="showHistoric = !showHistoric"
              :class="{ active: showHistoric }">
              User calculations
            </button>
          </div>
        </TopNavbar>

        <LeftMenu>
          <!-- insert the button for copying link ids here -->
          <template #up>
            <button v-if="links.hasLinks">
              <Icon icon="mingcute:three-circles-fill" width="38" height="38" class="menu-btn"
                @click="toggleLinksCluster(clusterGroup as L.LayerGroup, clusterMarkers)"
                :class="{ active: config.clustersVisible }" />
            </button>
          </template>

          <template #down>
            <Icon v-if="selectedLinkIds.size !== 0" icon="clarity:copy-to-clipboard-line" width="38" height="38"
              class="menu-btn" @click="copySelectedLinksToClipboard" />
          </template>
        </LeftMenu>

        <RightMenu v-if="config.splitView" />

        <LinkFilter ref="linkFilter" />

        <LayerControls :class="config.splitView ? 'left-[calc(25%-190px)]' : null" map-target="main" />
        <LayerControls v-if="config.splitView" class="left-[calc(75%-190px)]" map-target="secondary" />

        <LayerSwitcher v-if="config.mainLayerSwitcherVisible" map-target="main" ref="layerSwitcherMain" />
        <LayerSwitcher v-if="config.secondaryLayerSwitcherVisible" class="left-[calc(50%+3.75rem)]"
          map-target="secondary" ref="layerSwitcherSecondary" />

        <!-- primary -->
        <PrecipitationBar v-if="activeLayerMain?.id == 'merge1h' && config.barVisible"
          :class="config.splitView ? 'right-[calc(50%+0.75rem)]' : 'right-3'" />
        <ReflectivityBar v-if="
          (activeLayerMain?.id == 'maxz' ||
            activeLayerMain?.id == 'raincz' ||
            activeLayerMain?.id == 'user-calc') &&
          config.barVisible" :class="config.splitView ? 'right-[calc(50%+0.75rem)]' : 'right-3'"
          :layer-id="activeLayerMain.id" />


        <!-- secondary -->
        <PrecipitationBar v-if="activeLayerSecondary?.id == 'merge1h' && config.barVisible" />
        <ReflectivityBar v-if="
          (activeLayerSecondary?.id == 'maxz' ||
            activeLayerSecondary?.id == 'raincz' ||
            activeLayerSecondary?.id == 'user-calc') &&
          config.barVisible" :layer-id="activeLayerSecondary.id" />

        <DataPlotting v-show="config.dataPlottingVisible" :start="config.start" :end="config.end" />
        <LinkTable v-show="links.showLinkTable && links.linkFilterVisible" ref="linkTable" />
        <RainHistoric :link-ids="selectedLinkIds" :show-historic="showHistoric" ref="userCalculations" />

        <!-- date time selector -->
        <div v-show="!config.realtime && config.datetimeSelectorVisible"
          class="absolute top-14 left-36.5 z-30 w-64 rounded-md bg-gray-800 p-2" ref="datetimeSelector">

          <label class="mb-1 block text-sm text-white">Start</label>
          <Datepicker v-model="selectedStart" utc time-picker-inline model-type="date" :max-date="new Date()"
            class="mb-3 w-full text-sm" dark :format="formatDateForDatepicker" :timezone="config.datetimeFormat" />

          <label class="mb-1 block text-sm text-white">End</label>
          <Datepicker v-model="selectedEnd" utc time-picker-inline model-type="date" :max-date="new Date()"
            class="mb-4 w-full text-sm" dark :format="formatDateForDatepicker" :timezone="config.datetimeFormat" />

          <button
            class="w-full rounded bg-cyan-600 py-1 text-sm text-white hover:bg-cyan-700 enabled:cursor-pointer disabled:bg-gray-700 disabled:text-gray-500"
            :disabled="!isTimeRangeValid" @click="applyCustomRange">
            Select time range
          </button>
        </div>
        <!-- date time selector end-->

      </div>
    </main>
  </div>
</template>

<style>
.leaflet-image-layer {
  image-rendering: pixelated !important;
}

.leaflet-control-attribution.leaflet-control {
  display: none;
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
