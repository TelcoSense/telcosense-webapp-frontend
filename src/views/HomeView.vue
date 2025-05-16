<script setup lang="ts">
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type { ImageSequenceLayer } from '@/composables/useImageSequenceLayer'
import type { Ref } from 'vue'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import LayerControls from '@/components/LayerControls.vue'
import LayerSwitcher from '@/components/LayerSwitcher.vue'
import LinkFilter from '@/components/LinkFilter.vue'
import PrecipitationBar from '@/components/PrecipitationBar.vue'
import ReflectivityBar from '@/components/ReflectivityBar.vue'
import TopNavbar from '@/components/TopNavbar.vue'

import { useLinksStore } from '@/stores/links'
import { useWeatherDataStore } from '@/stores/weatherData'
import { useWeatherStationsStore } from '@/stores/weatherStations'

import { useActiveLayer } from '@/composables/useActiveLayer'
import { useImageLayer } from '@/composables/useImageLayer'
import { useLinkSelection } from '@/composables/useLinkSelection'
import { useRealtime } from '@/composables/useRealtime'
import { useStationSelection } from '@/composables/useStationSelection'
import { datetimeFormat } from '@/utils'

// realtime composable
const { currentTimestamp, oneWeekAgoTimestamp } = useRealtime(10)

// store definitions
const weatherStations = useWeatherStationsStore()
const weatherData = useWeatherDataStore()
const links = useLinksStore()

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

const { onMapMouseDown: onStationMouseDown } = useStationSelection({
  map: map as Ref<L.Map | null>,
  dragBox,
  stations: weatherStations,
  selectedStationIds,
  drawStations,
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
  map.value = L.map('map', {
    preferCanvas: true,
    zoomControl: false,
    renderer: L.canvas(),
  }).setView([49.74379, 15.33863], 8)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map.value as L.Map)
  stationsGroup.value.addTo(map.value as L.Map)
  linksGroup.value.addTo(map.value as L.Map)
}

// map layers setup
const { activeLayer } = useActiveLayer()

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
  weatherStations.fetchWeatherStations()
  links.fetchLinks()
  dragBox.value = document.getElementById('drag-box') as HTMLDivElement

  const mapObject = map.value as L.Map

  mapObject.on('mousedown', (e: L.LeafletMouseEvent) => {
    onMapMouseDown(e)
    onStationMouseDown(e)
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
    const color = selectedLinkIds.value.has(link.id) ? 'red' : 'black'
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
        `<div class="font-inter text-black">
          <div class="mb-1 border-b text-base font-semibold border-gray-300">Link ID: ${link.id}</div>
          <div class="text-base">
            Site A: ${link.site_A.name}<br />
            Site B: ${link.site_B.name}<br />
            IP Address A: ${link.ip_address_A}<br />
            IP Address B: ${link.ip_address_B}<br />
            Frequency A: ${(link.frequency_A / 1000).toFixed(2)} GHz<br />
            Frequency B: ${(link.frequency_B / 1000).toFixed(2)} GHz<br />
            Length: ${link.length} m<br />
            Polarization: ${link.polarization}<br />
            Tech: ${link.technology}<br />
          </div>
        </div>`,
        tooltipOptions,
      )
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
    const color = selectedStationIds.value.has(ws.id) ? 'red' : 'blue'
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
        `<div class="font-inter text-black">
          <div class="mb-1 border-b text-base border-gray-300 font-semibold">${ws.full_name}</div>
          <div class="text-base">
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
        await weatherData.fetchStationData(oneWeekAgoTimestamp.value, currentTimestamp.value, ghId)
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
</script>

<template>
  <div class="font-inter min-h-screen">
    <main class="h-[calc(100vh)]">
      <div class="relative flex h-full w-full flex-row items-center justify-center">
        <div id="map" class="leaflet-container z-0 h-full w-full"></div>

        <div
          id="timestamps"
          class="absolute right-6 bottom-6 z-10 flex flex-col rounded-md p-3 text-sm text-gray-800"
        >
          <p v-if="oneWeekAgoTimestamp">
            One week ago:
            <span class="font-chivo">{{ datetimeFormat(oneWeekAgoTimestamp, 'UTC') }} </span>
          </p>
          <p v-if="currentTimestamp">
            Current date:
            <span class="font-chivo">{{ datetimeFormat(currentTimestamp, 'UTC') }} </span>
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
          <button
            v-if="weatherStations.hasStations"
            class="h-8 cursor-pointer rounded-md border bg-amber-200 px-3 hover:bg-amber-300"
            :class="{ 'bg-amber-300': !weatherStations.hideAll }"
            @click="weatherStations.hideAll = !weatherStations.hideAll"
          >
            Weather stations
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
      </div>
    </main>
  </div>
</template>

<style>
.leaflet-image-layer {
  image-rendering: pixelated !important;
}
</style>
