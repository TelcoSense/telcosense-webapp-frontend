<script setup lang="ts">
import L from 'leaflet'

import 'leaflet/dist/leaflet.css'

import { useLinksStore } from '@/stores/links'
import { useWeatherStationsStore } from '@/stores/weatherStations'
import { onMounted, ref, watch } from 'vue'

import LinkFilter from '@/components/LinkFilter.vue'
import TopNavbar from '@/components/TopNavbar.vue'

onMounted(() => {
  initMap()

  weatherStations.fetchWeatherStations()
  links.fetchLinks()

  dragBox = document.getElementById('drag-box') as HTMLDivElement
  map.value!.on('mousedown', onMapMouseDown)
})

let dragStart: L.Point | null = null
let dragBox: HTMLDivElement
let dragging = false

function onMapMouseDown(e: L.LeafletMouseEvent) {
  if (!e.originalEvent.ctrlKey) return

  map.value!.dragging.disable()
  e.originalEvent.preventDefault()

  dragStart = map.value!.mouseEventToContainerPoint(e.originalEvent)
  dragBox.style.left = `${dragStart.x}px`
  dragBox.style.top = `${dragStart.y}px`
  dragBox.style.width = `0px`
  dragBox.style.height = `0px`
  dragBox.classList.remove('hidden')
  dragging = true

  function onMouseMove(e: MouseEvent) {
    if (!dragging || !dragStart) return

    const current = map.value!.mouseEventToContainerPoint(e)
    const left = Math.min(dragStart.x, current.x)
    const right = Math.max(dragStart.x, current.x)
    const top = Math.min(dragStart.y, current.y)
    const bottom = Math.max(dragStart.y, current.y)

    dragBox.style.left = `${left}px`
    dragBox.style.top = `${top}px`
    dragBox.style.width = `${right - left}px`
    dragBox.style.height = `${bottom - top}px`
  }

  function onMouseUp(e: MouseEvent) {
    if (!dragging || !dragStart) return
    dragging = false
    dragBox.classList.add('hidden')
    map.value!.dragging.enable()
    const end = map.value!.mouseEventToContainerPoint(e)
    const bounds = L.latLngBounds(
      map.value!.containerPointToLatLng(
        L.point(Math.min(dragStart.x, end.x), Math.min(dragStart.y, end.y)),
      ),
      map.value!.containerPointToLatLng(
        L.point(Math.max(dragStart.x, end.x), Math.max(dragStart.y, end.y)),
      ),
    )
    selectedLinkIds.value.clear()
    links.filteredLinks.forEach((link) => {
      const pointA = L.latLng(link.site_A.y, link.site_A.x)
      const pointB = L.latLng(link.site_B.y, link.site_B.x)
      const mid = L.latLng((pointA.lat + pointB.lat) / 2, (pointA.lng + pointB.lng) / 2)

      if (bounds.contains(pointA) || bounds.contains(pointB) || bounds.contains(mid)) {
        selectedLinkIds.value.add(link.id)
      }
    })
    drawLinks()
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

const weatherStations = useWeatherStationsStore()
const links = useLinksStore()

const map = ref<L.Map | null>(null)

const stationsGroup = ref<L.LayerGroup | null>(null)
const linksGroup = ref<L.LayerGroup | null>(null)

const tooltipOptions: L.TooltipOptions = {
  offset: [30, 0],
  direction: 'auto',
  permanent: false,
  sticky: false,
  opacity: 1,
}

const selectedLinkIds = ref<Set<number>>(new Set())

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
    const latA = link?.site_A?.y
    const lngA = link?.site_A?.x
    const latB = link?.site_B?.y
    const lngB = link?.site_B?.x

    const color = selectedLinkIds.value.has(link.id) ? 'red' : 'black'
    const polyline = L.polyline(
      [
        [latA, lngA],
        [latB, lngB],
      ],
      { color: color },
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
      <div class="relative flex h-full w-full flex-row items-center justify-end">
        <div id="map" ref="map" class="z-0 h-full w-full"></div>
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
      </div>
    </main>
  </div>
</template>
