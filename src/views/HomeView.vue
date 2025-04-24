<script setup lang="ts">
import { useLinksStore } from '@/stores/links'
import { useWeatherStationsStore } from '@/stores/weatherStations'
import { LCircleMarker, LMap, LTileLayer, LTooltip } from '@vue-leaflet/vue-leaflet'
import 'leaflet/dist/leaflet.css'
import { onMounted, ref } from 'vue'
import TopNavbar from '../components/TopNavbar.vue'

const mapCenter = ref([49.74379, 15.33863])

const weatherStationsVisible = ref(false)
const weatherStations = useWeatherStationsStore()

const links = useLinksStore()

onMounted(() => {
  weatherStations.fetchWeatherStations()
  links.fetchLinks()
})
</script>

<template>
  <div class="font-inter min-h-screen">
    <TopNavbar />
    <main class="h-[calc(100vh-4rem)]">
      <div class="relative h-full w-full">
        <LMap ref="map" :zoom="8" :center="mapCenter" :use-global-leaflet="false" class="z-0">
          <LTileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&amp;copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            layer-type="base"
            name="OpenStreetMap"
          />
          <div v-if="weatherStationsVisible">
            <LCircleMarker
              v-for="ws in weatherStations.stations"
              :key="ws?.id"
              :lat-lng="[ws.Y, ws.X]"
              :radius="5"
              color="blue"
            >
              <LTooltip :options="{ offset: [30, 0] }" class="font-inter text-black">
                <div class="text-base">
                  {{ ws.full_name }}
                </div>
                <div class="text-sm">
                  GH ID: {{ ws.gh_id }} <br />
                  WSI: {{ ws.wsi }}<br />
                  Lat: {{ ws.Y }}, Lon: {{ ws.X }}<br />
                  Elevation: {{ ws.elevation }}
                </div></LTooltip
              >
            </LCircleMarker>
          </div>
        </LMap>
        <div class="absolute top-4 z-10 flex w-full items-center justify-center gap-x-2">
          <button
            v-if="weatherStations.hasStations"
            class="cursor-pointer border bg-amber-200 p-1 hover:bg-amber-300"
            :class="{ 'bg-amber-300': weatherStationsVisible }"
            @click="weatherStationsVisible = !weatherStationsVisible"
          >
            Weather stations
          </button>
          <button class="cursor-pointer border bg-amber-200 p-1 hover:bg-amber-300">Links</button>
        </div>
      </div>
    </main>
  </div>
</template>
