<script setup lang="ts">
import { useConfigStore } from '@/stores/config'
import { useLinksStore } from '@/stores/links'
import { ref, watch } from 'vue'

const links = useLinksStore()
const config = useConfigStore()

function getTechnologiesForGroup(group: string): string[] {
  return [
    ...new Set(
      links.links.filter((link) => link.influx_mapping === group).map((link) => link.technology),
    ),
  ]
}

function isGroupChecked(group: string): boolean {
  const techs = getTechnologiesForGroup(group)
  return techs.every((tech) => links.selectedTechnologies.includes(tech))
}

function isGroupIndeterminate(group: string): boolean {
  const techs = getTechnologiesForGroup(group)
  const selectedTechs = techs.filter((tech) => links.selectedTechnologies.includes(tech))
  return selectedTechs.length > 0 && selectedTechs.length < techs.length
}

function toggleGroup(event: Event, group: string) {
  const target = event.target as HTMLInputElement
  const willBeChecked = target.checked
  const techs = getTechnologiesForGroup(group)

  if (willBeChecked) {
    links.selectedTechnologies = [...new Set([...links.selectedTechnologies, ...techs])]
  } else {
    links.selectedTechnologies = links.selectedTechnologies.filter(
      (tech: string) => !techs.includes(tech),
    )
  }
}

function toggleTech(group: string, tech: string) {
  const isSelected = links.selectedTechnologies.includes(tech)

  if (isSelected) {
    links.selectedTechnologies = links.selectedTechnologies.filter((t: string) => t !== tech)
  } else {
    links.selectedTechnologies.push(tech)
  }

  const techsInGroup = Object.keys(links.groupedLinksByMappingAndTechnology[group] || [])
  const anyTechSelected = techsInGroup.some((t: string) => links.selectedTechnologies.includes(t))

  if (anyTechSelected) {
    if (!links.selectedGroups.includes(group)) {
      links.selectedGroups.push(group)
    }
  } else {
    links.selectedGroups = links.selectedGroups.filter((g: string) => g !== group)
  }
}

// track collapsed state per group
const collapsedGroups = ref<Record<string, boolean>>({})

// initialize collapsed state for all groups (collapsed by default)
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

const FILTER_KEY = 'linkFilters'

watch(
  () => ({
    hideAll: links.hideAll,
    selectedGroups: links.selectedGroups,
    selectedTechnologies: links.selectedTechnologies,
    selectedPolarizations: links.selectedPolarizations,
    manuallyDisabledLinkIds: links.manuallyDisabledLinkIds,
    minDistance: links.minDistance,
    maxDistance: links.maxDistance,
    minFrequency: links.minFrequency,
    maxFrequency: links.maxFrequency,
  }),
  (val) => {
    localStorage.setItem(FILTER_KEY, JSON.stringify(val))
  },
  { deep: true },
)


</script>

<template>
  <div v-if="!links.loading && links.hasLinks"
    class="absolute top-14 left-15 z-20 flex flex-col rounded-md text-xs text-white md:text-sm" :class="{
      'w-[250] border border-gray-600 bg-gray-800 p-2  md:w-[300px]':
        config.linkFilterVisible,
    }">
    <div v-if="config.linkFilterVisible">
      <div class="w-full border-b border-gray-600 pb-1.5 text-white">Link filter</div>
      <!-- length filter -->
      <div class="py-2">
        <div class="flex justify-between">
          <label class="text-white">Length (m)</label>
          <button @click="links.resetLengthFilter" class="cursor-pointer text-red-300 hover:underline">
            Reset
          </button>
        </div>
        <div class="mt-1 flex justify-between">
          <div class="flex py-1">
            <span class="mr-1 py-1 text-white">Min</span>
            <input type="number" v-model.number="links.minDistance"
              class="w-16 rounded-md bg-gray-700 p-1 text-white focus:outline-none" min="0" />
          </div>
          <div class="flex py-1">
            <span class="mr-1 py-1 text-white">Max</span>
            <input type="number" v-model.number="links.maxDistance"
              class="w-16 rounded-md bg-gray-700 p-1 text-white focus:outline-none" min="0" />
          </div>
        </div>
      </div>
      <!-- freq filter-->
      <div class="py-2">
        <div class="flex justify-between">
          <label class="text-white">Frequency (GHz)</label>
          <button @click="links.resetFrequencyFilter" class="cursor-pointer text-red-300 hover:underline">
            Reset
          </button>
        </div>
        <div class="mt-1 flex justify-between">
          <div class="flex py-1">
            <span class="mr-1 py-1 text-white">Min</span>
            <input type="number" :value="links.minFrequency / 1000" @input="
              (e) =>
                (links.minFrequency = parseFloat((e.target as HTMLInputElement).value) * 1000)
            " class="w-16 rounded-md bg-gray-700 p-1 text-white focus:outline-none" min="0" />
          </div>
          <div class="flex py-1">
            <span class="mr-1 py-1 text-white">Max</span>
            <input type="number" :value="links.maxFrequency / 1000" @input="
              (e) =>
                (links.maxFrequency = parseFloat((e.target as HTMLInputElement).value) * 1000)
            " class="w-16 rounded-md bg-gray-700 p-1 text-white focus:outline-none" min="0" />
          </div>
        </div>
      </div>
      <!-- polarization -->
      <div class="py-2">
        <span>Polarization: </span>
        <label v-for="p in ['V', 'H', 'X']" :key="p" class="mr-3">
          <input type="checkbox" :value="p" v-model="links.selectedPolarizations" class="mr-1" />
          {{ p }}
        </label>
      </div>
      <!-- by IDs -->
      <div class="hidden py-2 md:block">
        <div class="flex justify-between">
          <label class="text-white">Filter by link IDs</label>
          <button @click="links.resetManualIdFilter" class="cursor-pointer text-red-300 hover:underline">
            Reset
          </button>
        </div>
        <input type="text" v-model="links.manualIdFilterInput"
          @change="links.applyManualIdFilter(links.manualIdFilterInput)" placeholder="e.g. 101, 204, 350"
          class="mt-1 w-full rounded-md bg-gray-700 p-1 text-white focus:outline-none" />
      </div>
      <!-- by IDs end -->

      <!-- actual groups and techs -->
      <div class="mb-2 flex h-[200px] flex-col gap-3 overflow-y-auto rounded-md border border-gray-600 p-2 md:h-[306px]"
        style="scrollbar-gutter: stable; will-change: transform">
        <div v-for="(techs, group) in links.groupedLinksByMappingAndTechnology" :key="group"
          class="rounded-md border border-gray-600 bg-gray-700 p-2">
          <div class="flex items-center justify-between">
            <label class="flex cursor-pointer items-center">
              <input type="checkbox" class="mr-2" :checked="isGroupChecked(group)"
                :indeterminate="isGroupIndeterminate(group)" @click="toggleGroup($event, group)" />
              {{ group }}
            </label>

            <button type="button" @click="collapsedGroups[group] = !collapsedGroups[group]"
              class="cursor-pointer text-gray-200 select-none hover:text-white" title="Toggle group">
              ({{ Object.values(techs).flat().length }})
              <span v-if="collapsedGroups[group]">▼</span>
              <span v-else>▲</span>
            </button>
          </div>
          <div v-show="!collapsedGroups[group]" class="mt-2 ml-4 flex flex-col gap-1">
            <label v-for="tech in Object.keys(techs)" :key="tech" class="flex cursor-pointer items-center select-none">
              <input type="checkbox" class="mr-2" :checked="links.selectedTechnologies.includes(tech)"
                @change="toggleTech(group, tech)" />
              {{ tech }} ({{ techs[tech].length }})
            </label>
          </div>
        </div>
      </div>
      <!-- link table toggle -->
      <div class="4 mb-2 hidden flex-col gap-3 md:flex">
        <button @click="links.showLinkTable = !links.showLinkTable" :class="[
          'cursor-pointer rounded  px-3 py-1 text-white  hover:opacity-100',
          links.showLinkTable
            ? 'bg-cyan-600  enabled:hover:bg-cyan-700'
            : 'bg-gray-600  enabled:hover:bg-gray-700',
        ]">
          Show link table
        </button>
      </div>
      <div>
        Showing
        <span class="font-chivo text-cyan-300">{{ links.filteredLinks.length }}/{{ links.links.length }}</span>
        links
      </div>
      <button @click="links.resetAllFilters" class="cursor-pointer text-red-300 hover:underline">
        Reset all filters
      </button>
    </div>
  </div>
</template>
