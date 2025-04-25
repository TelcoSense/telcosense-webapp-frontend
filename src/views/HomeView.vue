<script setup lang="ts">
import { useLinksStore } from '@/stores/links'
import { useWeatherStationsStore } from '@/stores/weatherStations'
import { LCircleMarker, LMap, LTileLayer, LTooltip, LPolyline } from '@vue-leaflet/vue-leaflet'
import 'leaflet/dist/leaflet.css'
import { onMounted, ref, watch } from 'vue'
import TopNavbar from '../components/TopNavbar.vue'

const mapCenter = ref([49.74379, 15.33863])

const weatherStationsVisible = ref(false)
const weatherStations = useWeatherStationsStore()

const links = useLinksStore()

onMounted(async () => {
  await weatherStations.fetchWeatherStations()
  await links.fetchLinks()
})

function toggleGroup(group: string) {
  const techs = Object.keys(links.groupedLinksByMappingAndTechnology[group] || [])

  const allTechsSelected = techs.every((t) => links.selectedTechnologies.includes(t))

  if (allTechsSelected) {
    // Remove all techs in this group
    links.selectedTechnologies = links.selectedTechnologies.filter((t) => !techs.includes(t))
  } else {
    // Add all techs in this group
    links.selectedTechnologies = [...new Set([...links.selectedTechnologies, ...techs])]
  }

  // Now sync selectedGroups based on selectedTechnologies
  const stillSelected = techs.some((t) => links.selectedTechnologies.includes(t))
  if (stillSelected) {
    if (!links.selectedGroups.includes(group)) {
      links.selectedGroups.push(group)
    }
  } else {
    links.selectedGroups = links.selectedGroups.filter((g) => g !== group)
  }
}

function toggleTech(group: string, tech: string) {
  const isSelected = links.selectedTechnologies.includes(tech)

  if (isSelected) {
    links.selectedTechnologies = links.selectedTechnologies.filter((t) => t !== tech)
  } else {
    links.selectedTechnologies.push(tech)
  }

  // Sync selectedGroups based on techs inside the group
  const techsInGroup = Object.keys(links.groupedLinksByMappingAndTechnology[group] || [])
  const anyTechSelected = techsInGroup.some((t) => links.selectedTechnologies.includes(t))

  if (anyTechSelected) {
    if (!links.selectedGroups.includes(group)) {
      links.selectedGroups.push(group)
    }
  } else {
    links.selectedGroups = links.selectedGroups.filter((g) => g !== group)
  }
}

// Track collapsed state per group
const collapsedGroups = ref<Record<string, boolean>>({})

// Initialize collapsed state for all groups (collapsed by default)
watch(
  () => links.groupedLinksByMappingAndTechnology,
  (grouped) => {
    for (const group in grouped) {
      if (!(group in collapsedGroups.value)) {
        collapsedGroups.value[group] = true
      }
    }
  },
  { immediate: true },
)
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
                <div class="mb-1 border-b text-base">
                  {{ ws.full_name }}
                </div>
                <div class="text-base">
                  GH ID: {{ ws.gh_id }} <br />
                  WSI: {{ ws.wsi }}<br />
                  Lat: {{ ws.Y }}, Lon: {{ ws.X }}<br />
                  Elevation: {{ ws.elevation }} m<br /></div
              ></LTooltip>
            </LCircleMarker>
          </div>

          <L-Polyline
            v-for="link in links.filteredLinks"
            :lat-lngs="[
              [link.site_A.y, link.site_A.x],
              [link.site_B.y, link.site_B.x],
            ]"
            color="black"
            :key="link?.id"
          >
            <LTooltip :options="{ offset: [30, 0] }" class="font-inter text-black">
              <div class="mb-1 border-b text-base font-semibold">Link ID: {{ link.id }}</div>
              <div class="text-base">
                Site A: {{ link.site_A.name }}<br />
                Site B: {{ link.site_B.name }}<br />
                IP Address A: {{ link.ip_address_A }}<br />
                IP Address B: {{ link.ip_address_B }}<br />
                Frequency A: {{ link.frequency_A / 1000 }} GHz<br />
                Frequency B: {{ link.frequency_B / 1000 }} GHz<br />
                Length: {{ link.length }} m<br />
                Polarization: {{ link.polarization }}<br />
                Tech: {{ link.technology }}<br />
              </div>
            </LTooltip>
          </L-Polyline>
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
        </div>
        <!-- link filter -->
        <div
          v-if="!links.loading"
          class="scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 absolute top-4 right-4 z-20 max-h-[80vh] w-[320px] overflow-y-scroll bg-gray-800 p-4 text-white"
        >
          <!-- length -->
          <div class="mb-3 border border-gray-700 p-4">
            <div class="flex justify-between">
              <label class="text-white">Length filter [m]</label>
              <button @click="links.resetLengthFilter" class="cursor-pointer hover:underline">
                Reset
              </button>
            </div>
            <div class="mt-1 flex justify-between gap-3">
              <div class="flex items-center bg-gray-700 px-2 py-1">
                <span class="mr-1 text-sm text-gray-400">Min</span>
                <input
                  type="number"
                  v-model.number="links.minDistance"
                  class="w-16 bg-transparent text-sm text-white focus:outline-none"
                  min="0"
                />
              </div>
              <div class="flex items-center bg-gray-700 px-2 py-1">
                <span class="mr-1 text-sm text-gray-400">Max</span>
                <input
                  type="number"
                  v-model.number="links.maxDistance"
                  class="w-16 bg-transparent text-sm text-white focus:outline-none"
                  min="0"
                />
              </div>
            </div>
          </div>
          <!-- freqs -->
          <div class="mb-3 border border-gray-700 p-4">
            <div class="flex justify-between">
              <label class="text-white">Frequency filter [GHz]</label>
              <button @click="links.resetFrequencyFilter" class="cursor-pointer hover:underline">
                Reset
              </button>
            </div>
            <div class="mt-1 flex justify-between gap-3">
              <div class="flex items-center bg-gray-700 px-2 py-1">
                <span class="mr-1 text-sm text-gray-400">Min</span>
                <input
                  type="number"
                  :value="links.minFrequency / 1000"
                  @input="(e) => (links.minFrequency = parseFloat(e.target.value) * 1000)"
                  class="w-16 bg-transparent text-sm text-white focus:outline-none"
                  min="0"
                />
              </div>
              <div class="flex items-center bg-gray-700 px-2 py-1">
                <span class="mr-1 text-sm text-gray-400">Max</span>
                <input
                  type="number"
                  :value="links.maxFrequency / 1000"
                  @input="(e) => (links.maxFrequency = parseFloat(e.target.value) * 1000)"
                  class="w-16 bg-transparent text-sm text-white focus:outline-none"
                  min="0"
                />
              </div>
            </div>
          </div>
          <div class="mb-3 border border-gray-700 p-4">
            <span>Polarization: </span>
            <label v-for="p in ['V', 'H', 'X']" :key="p" class="mr-3 text-sm">
              <input
                type="checkbox"
                :value="p"
                v-model="links.selectedPolarizations"
                class="mr-1"
              />
              {{ p }}
            </label>
          </div>

          <div class="flex flex-col gap-3">
            <div
              v-for="(techs, group) in links.groupedLinksByMappingAndTechnology"
              :key="group"
              class="border border-gray-700 p-4"
            >
              <div class="flex items-center justify-between">
                <label class="flex cursor-pointer items-center font-semibold">
                  <input
                    type="checkbox"
                    class="mr-2"
                    :checked="links.selectedGroups.includes(group)"
                    @change="toggleGroup(group)"
                  />
                  {{ group }}
                </label>

                <button
                  type="button"
                  @click="collapsedGroups[group] = !collapsedGroups[group]"
                  class="cursor-pointer text-gray-400 select-none hover:text-white"
                  title="Toggle group"
                >
                  ({{ Object.values(techs).flat().length }})
                  <span v-if="collapsedGroups[group]">▼</span>
                  <span v-else>▲</span>
                </button>
              </div>
              <div v-show="!collapsedGroups[group]" class="mt-2 ml-4 flex flex-col gap-1">
                <label
                  v-for="tech in Object.keys(techs)"
                  :key="tech"
                  class="flex cursor-pointer items-center text-sm select-none"
                >
                  <input
                    type="checkbox"
                    class="mr-2"
                    :checked="links.selectedTechnologies.includes(tech)"
                    @change="toggleTech(group, tech)"
                  />
                  {{ tech }} ({{ techs[tech].length }})
                </label>
              </div>
            </div>
          </div>
        </div>
        <!-- link filter end -->
      </div>
    </main>
  </div>
</template>
