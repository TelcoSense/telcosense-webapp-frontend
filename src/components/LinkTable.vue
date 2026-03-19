<script setup lang="ts">
import { useLinksStore } from '@/stores/links'
import { isFullLink } from '@/stores/links'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'

const store = useLinksStore()
const { links, filteredLinks } = storeToRefs(store)

const filteredLinkIds = computed(() => new Set(filteredLinks.value.map((link) => link.id)))
const searchQuery = ref('')
const debouncedQuery = ref('')
let debounceTimeout: number | null = null

watch(searchQuery, (newQuery) => {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    debouncedQuery.value = newQuery
  }, 250)
})

const filteredAndSearchedLinks = computed(() => {
  const fullLinks = links.value.filter(isFullLink)
  if (!debouncedQuery.value.trim()) return fullLinks
  const q = debouncedQuery.value.toLowerCase()
  return fullLinks.filter((link) => {
    const allValues = [
      link.id,
      link.site_A.name,
      link.site_B.name,
      link.ip_address_A,
      link.ip_address_B,
      //   link.frequency_A,
      //   link.frequency_B,
      //   link.length,
      //   link.polarization,
      //   link.technology,
    ]
      .join(' ')
      .toLowerCase()
    return allValues.includes(q)
  })
})

function cellClass(id: number, truncate = false) {
  return [
    'border-b border-gray-700 px-3 py-2 whitespace-nowrap',
    truncate && 'max-w-[160px] truncate overflow-hidden text-ellipsis',
    !filteredLinkIds.value.has(id) && 'text-gray-400',
  ]
}
</script>

<template>
  <div class="absolute top-14 left-92 w-full max-w-screen-xl rounded-md bg-gray-800 p-2 text-white">
    <div class="mb-2 flex flex-row items-center justify-between gap-x-2">
      <input v-model="searchQuery" type="text" placeholder="Find link by ID, site, or IP address..."
        class="w-[75%] rounded-md bg-gray-700 p-1 text-sm text-white  focus:outline-none" />

      <div class="flex items-center gap-x-2">
        <div class="text-sm text-nowrap">
          Found
          <span class="font-chivo text-cyan-300">{{ filteredAndSearchedLinks.length }}</span> links
        </div>

        <button id="table-button-close" @click="store.showLinkTable = false" :class="[
          'cursor-pointer rounded  px-3 py-1 text-white  text-sm bg-gray-600  enabled:hover:bg-gray-700']">
          Close
        </button>
      </div>
    </div>

    <div class="max-h-[50vh] overflow-y-scroll" style="scrollbar-gutter: stable; will-change: transform">
      <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
        <thead class="sticky top-0 z-10 bg-gray-900">
          <tr>
            <th class="border-b border-gray-700 px-3 py-2 font-normal whitespace-nowrap">ID</th>
            <th class="border-b border-gray-700 px-3 py-2 font-normal whitespace-nowrap">Site A</th>
            <th class="border-b border-gray-700 px-3 py-2 font-normal whitespace-nowrap">Site B</th>
            <th class="border-b border-gray-700 px-3 py-2 font-normal whitespace-nowrap">IP A</th>
            <th class="border-b border-gray-700 px-3 py-2 font-normal whitespace-nowrap">IP B</th>

            <th class="border-b border-gray-700 px-3 py-2 font-normal whitespace-nowrap">
              Freq A (GHz)
            </th>
            <th class="border-b border-gray-700 px-3 py-2 font-normal whitespace-nowrap">
              Freq B (GHz)
            </th>
            <th class="border-b border-gray-700 px-3 py-2 font-normal whitespace-nowrap">
              Length (m)
            </th>
            <th class="border-b border-gray-700 px-3 py-2 font-normal whitespace-nowrap">Pol.</th>
            <th class="truncate border-b border-gray-700 px-3 py-2 font-normal whitespace-nowrap">
              Tech
            </th>
            <th class="border-b border-gray-700 px-3 py-2 font-normal whitespace-nowrap">Hide</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="link in filteredAndSearchedLinks" :key="link.id" class="bg-gray-800/40 hover:bg-gray-700">
            <td :class="cellClass(link.id)">{{ link.id }}</td>
            <td :class="cellClass(link.id, true)" :title="link.site_A.name">
              {{ link.site_A.name }}
            </td>
            <td :class="cellClass(link.id, true)" :title="link.site_B.name">
              {{ link.site_B.name }}
            </td>
            <td :class="cellClass(link.id)">{{ link.ip_address_A }}</td>
            <td :class="cellClass(link.id)">{{ link.ip_address_B }}</td>
            <td :class="cellClass(link.id)">{{ (link.frequency_A / 1000).toFixed(3) }}</td>
            <td :class="cellClass(link.id)">{{ (link.frequency_B / 1000).toFixed(3) }}</td>
            <td :class="cellClass(link.id)">{{ link.length }}</td>
            <td :class="cellClass(link.id)">{{ link.polarization }}</td>
            <td :class="cellClass(link.id, true)" :title="link.technology">
              {{ link.technology }}
            </td>

            <td class="border-b border-gray-700 px-3 py-2">
              <input type="checkbox" :checked="store.manuallyDisabledLinkIds.includes(link.id)"
                @change="store.toggleManualLinkDisable(link.id)" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
