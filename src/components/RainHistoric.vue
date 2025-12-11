<script setup lang="ts">
import Datepicker from '@vuepic/vue-datepicker'
import axios from 'axios'
import L from 'leaflet'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { api } from '@/api'
import getSecureConfig from '@/cookies'
import { datetimeFormat, toUtcDate } from '@/utils'

import { useConfigStore } from '@/stores/config'
import { useLayersStore } from '@/stores/layers'


import { useActiveLayer } from '@/composables/useActiveLayer'
import { useImageLayer } from '@/composables/useImageLayer'
import { useMap } from '@/composables/useMap'

const { map } = useMap()

// onMounted(() => {
//   if (activeTab.value === 'status') {
//     rainCalculations()
//     intervalId = window.setInterval(rainCalculations, 3000)
//   }
// })

onBeforeUnmount(() => {
  if (intervalId !== null) {
    clearInterval(intervalId)
  }
})

interface Calculation {
  id: number
  name: string
  status: 'pending' | 'running' | 'finished' | 'failed'
  result: string | null
  elapsed: number | null
  shared: boolean
  created_at: string
  start: string
  end: string
}

const userCalcLayer = useImageLayer('user-calc')
const { clearLayer } = useActiveLayer()

const config = useConfigStore()
const layers = useLayersStore()

const selectedStart = ref<Date | null>(null)
const selectedEnd = ref<Date | null>(null)

const showHistoric = ref<boolean>(false)

const props = defineProps<{
  linkIds: Set<number> | null
}>()

const activeTab = ref<'create' | 'status'>('status')
const calculations = ref<Calculation[]>([])
let intervalId: number | null = null

const showAdvanced = ref<boolean>(false)

const data = ref({
  name: '',
  start: null,
  end: null,
  step: 10,
  output_step: 10,
  min_length: 0.5,
  max_length: 100,
  is_mlp_enabled: false,
  rolling_hours: 1.0,
  rolling_values: 10,
  wet_dry_deviation: 0.8,
  baseline_samples: 5,
  idw_power: 2,
  idw_near: 8,
  idw_dist_m: 30000,
  is_crop_enabled: true,
  exclude_cmls: false,
})

async function viewCalculation(calc: Calculation) {
  if (!map.value) return
  applyCustomRange(calc.start, calc.end)
  userCalcLayer.clear()
  userCalcLayer.setMap(map.value as L.Map)
  userCalcLayer.setApiUrl(`/historic/${calc.name}/list`)
  userCalcLayer.setBounds(
    L.latLngBounds([48.047, 11.267], [51.458, 19.624]),
  )
  await userCalcLayer.fetchList(calc.start, calc.end)
}

async function startRainCalculation() {
  try {
    if (data.value.name && selectedStart.value && selectedEnd.value && props.linkIds) {
      const startUtc =
        config.datetimeFormat === 'UTC'
          ? toUtcDate(selectedStart.value).toISOString()
          : new Date(selectedStart.value).toISOString()
      const endUtc =
        config.datetimeFormat === 'UTC'
          ? toUtcDate(selectedEnd.value).toISOString()
          : new Date(selectedEnd.value).toISOString()

      await api.post(
        '/start-rain-calculation',
        { start: startUtc, end: endUtc, data: data.value, links_id: [...props.linkIds] },
        getSecureConfig(),
      )

      data.value.name = ''
      activeTab.value = 'status'
    }
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      console.error('Caught error:', err.response.data.message)
      alert(err.response.data.message)
    } else {
      console.error('Unknown error:', err)
    }
  }
}

async function rainCalculations() {
  try {
    const res = await api.get('/rain-calculations', getSecureConfig())
    calculations.value = res.data
  } catch (err) {
    console.error('Failed to fetch calculations:', err)
  }
}

async function deleteCalculation(id: number) {
  if (!confirm('Are you sure you want to delete this calculation?')) return

  try {
    await api.delete(`/rain-calculations/${id}`, getSecureConfig())
    // remove it from the list locally without waiting for the next poll
    calculations.value = calculations.value.filter((c) => c.id !== id)
    clearLayer()

    layers.maxz.clear()
    layers.merge1h.clear()
    layers.raincz.clear()

    config.start = null
    config.end = null
  } catch (err) {
    console.error('Failed to delete calculation:', err)
    alert('Failed to delete calculation')
  }
}

function formatDateForDatepicker(date: Date): string {
  return datetimeFormat(date.toISOString(), 'Europe/Prague')
}

function applyCustomRange(start: string, end: string) {
  if (!start || !end) return

  config.start = new Date(start).toISOString()
  config.end = new Date(end).toISOString()

  // weatherData.clear()
  // cmlData.clear()

  clearLayer()

  layers.maxz.clear()
  layers.merge1h.clear()
  layers.raincz.clear()

  layers.maxz.fetchList(config.start, config.end)
  layers.merge1h.fetchList(config.start, config.end)
  layers.raincz.fetchList(config.start, config.end)

  // cmlData.refresh(start.value, end.value)
  // weatherData.refresh(start.value, end.value)

  // timeRangeVisible.value = false
  config.dataPlottingVisible = true
}

watch(showHistoric, (visible) => {
  if (visible && activeTab.value === 'status') {
    rainCalculations()
    intervalId = window.setInterval(rainCalculations, 3000)
  } else if (!visible && intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
})

const activeCalculationCount = computed(
  () => calculations.value.filter((c) => c.status === 'pending' || c.status === 'running').length,
)

const canStart = computed(() => {
  const linksValid = props.linkIds !== null && props.linkIds.size > 0
  return data.value.name && selectedStart.value && selectedEnd.value && linksValid
})
</script>

<template>
  <div v-if="showHistoric && !config.realtime"
    class="absolute top-14 left-50.5 z-50 w-3xl rounded-md  backdrop-blur-xs border  border-gray-600 bg-gray-800 p-2 text-sm text-white">
    <div class="flex justify-between border-gray-400">
      User calculations
      <button class="cursor-pointer rounded bg-gray-600 px-3 py-1 text-white hover:bg-gray-500"
        @click="showHistoric = false">
        Close
      </button>
    </div>

    <div class="mb-2 flex gap-x-3">
      <button @click="activeTab = 'status'" :class="[
        'cursor-pointer rounded px-3 py-1 ',
        activeTab === 'status'
          ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
          : 'bg-gray-600 text-gray-200 hover:bg-gray-700',
      ]">
        View calculations
      </button>
      <button @click="activeTab = 'create'" :class="[
        'cursor-pointer rounded px-3 py-1 ',
        activeTab === 'create' ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-700',
      ]">
        New calculation
      </button>
    </div>

    <div v-if="activeTab === 'create'">
      <!-- name -->
      <div class="flex items-center">
        <label class="w-12">Name</label>
        <input v-model="data.name" class="w-full bg-gray-700 p-1 text-white focus:outline-none" />
      </div>

      <hr class="my-2 border-gray-700" />

      <!-- time -->
      <div class="grid grid-cols-2 gap-x-4">
        <div>
          <label class="block">Start</label>
          <Datepicker v-model="selectedStart" time-picker-inline utc model-type="date" :max-date="new Date()"
            class="w-full text-sm" dark :format="formatDateForDatepicker" :timezone="config.datetimeFormat" />
        </div>
        <div>
          <label class="block">End</label>
          <Datepicker v-model="selectedEnd" time-picker-inline utc model-type="date" :max-date="new Date()"
            class="w-full text-sm" dark :format="formatDateForDatepicker" :timezone="config.datetimeFormat" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-x-4">
        <div>
          <label class="block">Step (min)</label>
          <input v-model.number="data.step" type="number" class="w-full bg-gray-700 p-1 focus:outline-none" />
        </div>
        <div>
          <label class="block">Output step (min)</label>
          <input v-model.number="data.output_step" type="number" class="w-full bg-gray-700 p-1 focus:outline-none" />
        </div>
      </div>
      <hr class="my-2 border-gray-700" />

      <!-- CML filtering -->

      <div class="grid grid-cols-2 gap-x-4">
        <div>
          <label class="block">Min length (km)</label>
          <input v-model.number="data.min_length" type="number" class="w-full bg-gray-700 p-1 focus:outline-none" />
        </div>
        <div>
          <label class="block">Max length (km)</label>
          <input v-model.number="data.max_length" type="number" class="w-full bg-gray-700 p-1 focus:outline-none" />
        </div>
        <div class="flex gap-x-2 mt-2">
          <label class="block">Exclude CMLs</label>
          <input v-model="data.exclude_cmls" type="checkbox" />
        </div>
      </div>

      <hr class="my-2 border-gray-700" />

      <div v-if="showAdvanced">
        <!-- wet/dry -->
        <div class="grid grid-cols-2 gap-x-4">
          <div>
            <label class="block">Rolling hours</label>
            <input v-model.number="data.rolling_hours" :disabled="data.is_mlp_enabled" type="number"
              class="w-full bg-gray-700 p-1 focus:outline-none disabled:text-gray-400" />
          </div>
          <div>
            <label class="block">Rolling values</label>
            <input v-model.number="data.rolling_values" :disabled="data.is_mlp_enabled" type="number"
              class="w-full bg-gray-700 p-1 focus:outline-none disabled:text-gray-400" />
          </div>
          <div>
            <label class="block">Deviation</label>
            <input v-model.number="data.wet_dry_deviation" :disabled="data.is_mlp_enabled" type="number" step="0.1"
              class="w-full bg-gray-700 p-1 focus:outline-none disabled:text-gray-400" />
          </div>
          <div>
            <label class="block">Baseline samples</label>

            <input v-model.number="data.baseline_samples" :disabled="data.is_mlp_enabled" type="number"
              class="w-full bg-gray-700 p-1 focus:outline-none disabled:text-gray-400" />
          </div>

          <div class="mt-2 flex gap-x-2">
            <label class="block">Enable MLP</label>
            <input v-model="data.is_mlp_enabled" type="checkbox" />
          </div>
        </div>

        <hr class="my-2 border-gray-700" />

        <!-- interpolation -->
        <div class="grid grid-cols-2 gap-x-4">
          <div>
            <label class="block">IDW power</label>
            <input v-model.number="data.idw_power" type="number" class="w-full bg-gray-700 p-1 focus:outline-none" />
          </div>
          <div>
            <label class="block">IDW near</label>
            <input v-model.number="data.idw_near" type="number" class="w-full bg-gray-700 p-1 focus:outline-none" />
          </div>
          <div>
            <label class="block">IDW distance (m)</label>
            <input v-model.number="data.idw_dist_m" type="number" class="w-full bg-gray-700 p-1 focus:outline-none" />
          </div>
        </div>

        <hr class="my-2 border-gray-700" />

        <!-- crop -->
        <div class="flex gap-x-2">
          <label class="block">Enable crop (Czech borders)</label>
          <input v-model="data.is_crop_enabled" type="checkbox" />
        </div>

        <hr class="my-2 border-gray-700" />
      </div>

      <div class="mb-2 flex gap-x-2">
        <span>Selected links: {{ linkIds?.size }}</span>
        <span class="text-red-600" v-if="linkIds?.size === 0">Please select links using the map.</span>
      </div>

      <div class="flex justify-between gap-x-3">
        <!-- submit -->
        <button @click="showAdvanced = !showAdvanced"
          class="cursor-pointer rounded bg-gray-600 px-3 py-1 text-white hover:bg-gray-700 hover:opacity-100">
          {{ showAdvanced ? 'Hide advanced settings' : 'Show advanced settings' }}
        </button>

        <button @click="startRainCalculation"
          class="cursor-pointer rounded bg-cyan-600 px-3 py-1 text-sm text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canStart">
          Start calculation
        </button>
      </div>
    </div>

    <div v-if="activeTab === 'status'" class="text-sm text-white">
      <div class="mb-2">
        Available calculations:
        <span class="font-chivo">{{ 3 - activeCalculationCount }}/3</span>
      </div>

      <!-- Scrollable table container -->
      <div class="max-h-80 overflow-y-auto rounded">
        <table class="min-w-full table-fixed text-left">
          <thead class="sticky top-0 z-10 bg-gray-900">
            <tr class="border-b border-gray-600">
              <th class="w-[14%] truncate py-1 pr-2 pl-1 font-normal">Name</th>
              <th class="w-[8%] py-1 pr-2 font-normal">Status</th>
              <th class="w-[8%] py-1 pr-2 font-normal">Elapsed</th>
              <th class="w-[16%] py-1 pr-2 font-normal">Created</th>
              <th class="w-[16%] py-1 pr-2 font-normal">Start</th>
              <th class="w-[16%] py-1 pr-2 font-normal">End</th>
              <th class="w-[6%] py-1 pr-2 font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="calc in calculations" :key="calc.id" class="border-b border-gray-700 hover:bg-gray-700"
              :class="{ 'cursor-pointer': calc.status === 'finished' }"
              @click="calc.status === 'finished' ? viewCalculation(calc) : null">
              <td class="max-w-0 truncate py-1 pr-2 pl-1" :title="calc.name">
                {{ calc.name }}
              </td>
              <td class="py-1 pr-2 whitespace-nowrap">
                <span :class="{
                  'text-yellow-400': calc.status === 'pending',
                  'text-blue-400': calc.status === 'running',
                  'text-green-400': calc.status === 'finished',
                  'text-red-400': calc.status === 'failed',
                }">
                  {{ calc.status }}
                </span>
              </td>
              <td class="py-1 pr-2 whitespace-nowrap">
                <span v-if="calc.elapsed !== null">{{ (calc.elapsed / 60).toFixed(1) }} min</span>
                <span v-else class="text-gray-500">–</span>
              </td>
              <td class="font-chivo pt-0.5 pr-2 whitespace-nowrap">
                {{ datetimeFormat(calc.created_at, config.datetimeFormat) }}
              </td>
              <td class="font-chivo pt-0.5 pr-2 whitespace-nowrap">
                {{ datetimeFormat(calc.start, config.datetimeFormat) }}
              </td>
              <td class="font-chivo pt-0.5 pr-2 whitespace-nowrap">
                {{ datetimeFormat(calc.end, config.datetimeFormat) }}
              </td>
              <td class="py-1 pr-2">
                <button v-if="calc.status === 'finished' || calc.status === 'failed'"
                  @click="deleteCalculation(calc.id)" class="cursor-pointer text-sm text-red-300 hover:underline">
                  Delete
                </button>
                <button v-if="calc.status === 'pending' || calc.status === 'running'" class="text-sm text-gray-700">
                  Delete
                </button>
              </td>
            </tr>
            <tr v-if="calculations.length === 0">
              <td colspan="6" class="py-2 text-center text-gray-400">No calculations yet</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  <div v-else>
    <button v-if="!config.realtime && config.layerSwitcherVisible" class="absolute top-22.5 left-50.5 menu-btn text-sm"
      @click=" showHistoric = true">
      User calculations
    </button>
  </div>
</template>
