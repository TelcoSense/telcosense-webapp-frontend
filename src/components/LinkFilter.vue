<script setup lang="ts">
import { useLinksStore } from '@/stores/links'
import { ref, watch } from 'vue'

const links = useLinksStore()
const linkFilterVisible = ref<boolean>(true)

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
    links.selectedTechnologies = links.selectedTechnologies.filter((tech) => !techs.includes(tech))
  }
}

function toggleTech(group: string, tech: string) {
  const isSelected = links.selectedTechnologies.includes(tech)

  if (isSelected) {
    links.selectedTechnologies = links.selectedTechnologies.filter((t) => t !== tech)
  } else {
    links.selectedTechnologies.push(tech)
  }

  // sync selectedGroups based on techs inside the group
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
</script>

<template>
  <div
    v-if="!links.loading"
    class="absolute top-20 right-6 z-20 rounded-md text-white"
    :class="{ 'h-[75vh] w-[320px] overflow-y-scroll bg-gray-800 p-3': linkFilterVisible }"
  >
    <button
      @click="linkFilterVisible = !linkFilterVisible"
      class="mb-1.5 h-8 cursor-pointer rounded bg-gray-600 px-3 text-white hover:bg-gray-500 hover:opacity-100"
      :class="{ 'opacity-60': !linkFilterVisible }"
    >
      Link filter
    </button>
    <div v-if="linkFilterVisible">
      <!-- length filter -->
      <div class="mt-1.5 mb-3 border border-gray-700 p-4">
        <div class="flex justify-between">
          <label class="text-white">Length (m)</label>
          <button @click="links.resetLengthFilter" class="cursor-pointer hover:underline">
            Reset
          </button>
        </div>
        <div class="mt-1 flex justify-between">
          <div class="flex py-1">
            <span class="mr-1 py-1 text-sm text-gray-400">Min</span>
            <input
              type="number"
              v-model.number="links.minDistance"
              class="w-20 bg-gray-700 p-1 text-sm text-white focus:outline-none"
              min="0"
            />
          </div>
          <div class="flex py-1">
            <span class="mr-1 py-1 text-sm text-gray-400">Max</span>
            <input
              type="number"
              v-model.number="links.maxDistance"
              class="w-20 bg-gray-700 p-1 text-sm text-white focus:outline-none"
              min="0"
            />
          </div>
        </div>
      </div>
      <!-- freq filter-->
      <div class="mb-3 border border-gray-700 p-4">
        <div class="flex justify-between">
          <label class="text-white">Frequency (GHz)</label>
          <button @click="links.resetFrequencyFilter" class="cursor-pointer hover:underline">
            Reset
          </button>
        </div>
        <div class="mt-1 flex justify-between">
          <div class="flex py-1">
            <span class="mr-1 py-1 text-sm text-gray-400">Min</span>
            <input
              type="number"
              :value="links.minFrequency / 1000"
              @input="
                (e) =>
                  (links.minFrequency = parseFloat((e.target as HTMLInputElement).value) * 1000)
              "
              class="w-20 bg-gray-700 p-1 text-sm text-white focus:outline-none"
              min="0"
            />
          </div>
          <div class="flex py-1">
            <span class="mr-1 py-1 text-sm text-gray-400">Max</span>
            <input
              type="number"
              :value="links.maxFrequency / 1000"
              @input="
                (e) =>
                  (links.maxFrequency = parseFloat((e.target as HTMLInputElement).value) * 1000)
              "
              class="w-20 bg-gray-700 p-1 text-sm text-white focus:outline-none"
              min="0"
            />
          </div>
        </div>
      </div>
      <!-- polarization -->
      <div class="mb-3 border border-gray-700 p-4">
        <span>Polarization: </span>
        <label v-for="p in ['V', 'H', 'X']" :key="p" class="mr-3 text-sm">
          <input type="checkbox" :value="p" v-model="links.selectedPolarizations" class="mr-1" />
          {{ p }}
        </label>
      </div>

      <!-- actual groups and techs -->
      <div class="flex flex-col gap-3">
        <div
          v-for="(techs, group) in links.groupedLinksByMappingAndTechnology"
          :key="group"
          class="border border-gray-700 p-4"
        >
          <div class="flex items-center justify-between">
            <label class="flex cursor-pointer items-center">
              <input
                type="checkbox"
                class="mr-2"
                :checked="isGroupChecked(group)"
                :indeterminate="isGroupIndeterminate(group)"
                @click="toggleGroup($event, group)"
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
  </div>
</template>
