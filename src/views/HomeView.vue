<script setup lang="ts">
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { useLinksStore } from '@/stores/links'
import { useMaxzStore } from '@/stores/maxz'
import { useMerge1hStore } from '@/stores/merge1h'
import { useWeatherStationsStore } from '@/stores/weatherStations'

import type { Ref } from 'vue'
import { onMounted, ref, watch } from 'vue'

import { useLinkSelection } from '@/composables/useLinkSelection'
import { useRealtime } from '@/composables/useRealtime'

import LayerControls from '@/components/LayerControls.vue'
import LayerSwitcher from '@/components/LayerSwitcher.vue'
import LinkFilter from '@/components/LinkFilter.vue'
import TopNavbar from '@/components/TopNavbar.vue'

const weatherStations = useWeatherStationsStore()
const links = useLinksStore()

const maxz = useMaxzStore()
const merge1h = useMerge1hStore()

const map = ref<L.Map | null>(null)
const stationsGroup = ref<L.LayerGroup | null>(null)
const linksGroup = ref<L.LayerGroup | null>(null)

const selectedLinkIds = ref<Set<number>>(new Set())
const dragBox = ref<HTMLDivElement | null>(null)

const tooltipOptions: L.TooltipOptions = {
  offset: [30, 0],
  direction: 'auto',
  permanent: false,
  sticky: false,
  opacity: 1,
}

const { onMapMouseDown } = useLinkSelection({
  map: map as Ref<L.Map | null>,
  dragBox,
  links,
  selectedLinkIds,
  drawLinks,
})

const { currentTimestamp, oneWeekAgoTimestamp, formattedCountdown } = useRealtime(5)

onMounted(async () => {
  initMap()
  weatherStations.fetchWeatherStations()
  links.fetchLinks()
  dragBox.value = document.getElementById('drag-box') as HTMLDivElement

  const mapObject = map.value as L.Map
  mapObject.on('mousedown', onMapMouseDown)

  maxz.$reset()
  maxz.setMap(mapObject)

  merge1h.$reset()
  merge1h.setMap(mapObject)

  await maxz.fetchList(oneWeekAgoTimestamp.value, currentTimestamp.value)
  await merge1h.fetchList(oneWeekAgoTimestamp.value, currentTimestamp.value)
})

function initMap() {
  map.value = L.map('map', {
    preferCanvas: true,
    zoomControl: false,
    renderer: L.canvas(),
  }).setView([49.74379, 15.33863], 8)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map.value as L.Map)

  stationsGroup.value = L.layerGroup().addTo(map.value as L.Map)
  linksGroup.value = L.layerGroup().addTo(map.value as L.Map)
}

function drawLinks() {
  linksGroup.value!.clearLayers()
  links.filteredLinks.forEach((link) => {
    const color = selectedLinkIds.value.has(link.id) ? 'red' : 'black'
    const polyline = L.polyline(
      [
        [link.site_A.y, link.site_A.x],
        [link.site_B.y, link.site_B.x],
      ],
      { color: color, weight: 2 },
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
    linksGroup.value!.addLayer(polyline)
  })
}

function drawStations() {
  stationsGroup.value!.clearLayers()
  weatherStations.filteredStations.forEach((ws) => {
    const marker = L.circleMarker([ws.Y, ws.X], {
      radius: 5,
      color: 'blue',
      fillColor: 'blue',
      fillOpacity: 0.5,
      weight: 0.5,
    })
    marker.bindTooltip(
      `<div class="font-inter text-black">
        <div class="mb-1 border-b text-base border-gray-300">${ws.full_name}</div>
        <div class="text-base">
          GH ID: ${ws.gh_id}<br/>
          WSI: ${ws.wsi}<br/>
          Lat: ${ws.Y}, Lon: ${ws.X}<br/>
          Elevation: ${ws.elevation} m
        </div>
      </div>`,
      tooltipOptions,
    )
    stationsGroup.value!.addLayer(marker)
  })
}

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
          class="absolute bottom-0 left-0 z-10 m-6 flex flex-col rounded-md bg-gray-800 p-2 text-white"
        >
          <span class="font-chivo"> {{ oneWeekAgoTimestamp }} </span>
          <span class="font-chivo"> {{ currentTimestamp }} </span>

          <p>
            Next update in: <span class="font-chivo">{{ formattedCountdown }}</span>
          </p>
        </div>

        <div
          id="drag-box"
          class="pointer-events-none absolute z-40 hidden border-2 border-blue-400 bg-blue-400/10"
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
      </div>
    </main>
  </div>
</template>

<style>
.leaflet-image-layer {
  image-rendering: pixelated !important;
}
</style>
