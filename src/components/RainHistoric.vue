<script setup lang="ts">
import { api } from '@/api'
import getSecureConfig from '@/cookies'
import { useConfigStore } from '@/stores/config'
import { datetimeFormat, toUtcDate } from '@/utils'
import Datepicker from '@vuepic/vue-datepicker'
import axios from 'axios'
import { ref } from 'vue'

const config = useConfigStore()

const selectedStart = ref<Date | null>(null)
const selectedEnd = ref<Date | null>(null)

const props = defineProps<{
  linkIds: Set<number> | null
}>()

const showAdvanced = ref<boolean>(false)

const data = ref({
  name: '',
  start: null,
  end: null,
  min_length: 0.5,
  max_length: 100,
  is_mlp_enabled: true,
  rolling_hours: 1.0,
  rolling_values: 10,
  wet_dry_deviation: 0.8,
  baseline_samples: 5,
  interp_res: 0.01,
  idw_power: 1,
  idw_near: 35,
  idw_dist: 1.5,
  x_min: 12.0905,
  x_max: 18.8591,
  y_min: 48.5525,
  y_max: 51.0557,
  is_crop_enabled: false,
})

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

      console.log(props.linkIds)
      await api.post(
        '/start-rain-calculation',
        { start: startUtc, end: endUtc, data: data.value, links_id: [...props.linkIds] },
        getSecureConfig(),
      )
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

function formatDateForDatepicker(date: Date): string {
  return datetimeFormat(date.toISOString(), 'Europe/Prague')
}
</script>

<template>
  <div class="absolute top-20 w-xl rounded-md bg-gray-800 p-3 text-sm text-white">
    <h2 class="mb-2">Calculation parameters</h2>

    <!-- name -->
    <div class="flex items-center">
      <label class="w-12">Name</label>
      <input v-model="data.name" class="w-full bg-gray-700 p-1 text-white focus:outline-none" />
    </div>

    <hr class="my-2 border-gray-700" />

    <!-- time -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block">Start</label>
        <Datepicker
          v-model="selectedStart"
          time-picker-inline
          utc
          model-type="date"
          :max-date="new Date()"
          class="mb-3 w-full text-sm"
          dark
          :format="formatDateForDatepicker"
          :timezone="config.datetimeFormat"
        />
      </div>
      <div>
        <label class="block">End</label>
        <Datepicker
          v-model="selectedEnd"
          time-picker-inline
          utc
          model-type="date"
          :max-date="new Date()"
          class="mb-3 w-full text-sm"
          dark
          :format="formatDateForDatepicker"
          :timezone="config.datetimeFormat"
        />
      </div>
    </div>
    <button
      @click="showAdvanced = !showAdvanced"
      class="cursor-pointer rounded bg-gray-600 px-3 py-1 text-white hover:bg-gray-500 hover:opacity-100"
    >
      {{ showAdvanced ? 'Hide advanced' : 'Show advanced' }}
    </button>
    <hr class="my-2 border-gray-700" />
    <div v-if="showAdvanced">
      <!-- CML filtering -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block">Min length (km)</label>
          <input
            v-model.number="data.min_length"
            type="number"
            class="w-full bg-gray-700 p-1 focus:outline-none"
          />
        </div>
        <div>
          <label class="block">Max length (km)</label>
          <input
            v-model.number="data.max_length"
            type="number"
            class="w-full bg-gray-700 p-1 focus:outline-none"
          />
        </div>
      </div>

      <hr class="my-2 border-gray-700" />

      <!-- limits -->
      <div class="grid grid-cols-2 gap-x-4">
        <div>
          <label>X min</label
          ><input
            v-model.number="data.x_min"
            type="number"
            class="w-full bg-gray-700 p-1 focus:outline-none"
          />
        </div>
        <div>
          <label>X max</label
          ><input
            v-model.number="data.x_max"
            type="number"
            class="w-full bg-gray-700 p-1 focus:outline-none"
          />
        </div>
        <div>
          <label>Y min</label
          ><input
            v-model.number="data.y_min"
            type="number"
            class="w-full bg-gray-700 p-1 focus:outline-none"
          />
        </div>
        <div>
          <label>Y max</label
          ><input
            v-model.number="data.y_max"
            type="number"
            class="w-full bg-gray-700 p-1 focus:outline-none"
          />
        </div>
      </div>
      <hr class="my-2 border-gray-700" />

      <!-- wet/dry -->
      <div class="grid grid-cols-2 gap-x-4">
        <div>
          <label class="block">Enable MLP</label>
          <input v-model="data.is_mlp_enabled" type="checkbox" />
        </div>
        <div>
          <label class="block">Rolling hours</label>
          <input
            v-model.number="data.rolling_hours"
            :disabled="data.is_mlp_enabled"
            type="number"
            class="w-full bg-gray-700 p-1 focus:outline-none disabled:text-gray-400"
          />
        </div>
        <div>
          <label class="block">Rolling values</label>
          <input
            v-model.number="data.rolling_values"
            :disabled="data.is_mlp_enabled"
            type="number"
            class="w-full bg-gray-700 p-1 focus:outline-none disabled:text-gray-400"
          />
        </div>
        <div>
          <label class="block">Deviation</label>
          <input
            v-model.number="data.wet_dry_deviation"
            :disabled="data.is_mlp_enabled"
            type="number"
            step="0.1"
            class="w-full bg-gray-700 p-1 focus:outline-none disabled:text-gray-400"
          />
        </div>
        <div>
          <label class="block">Baseline samples</label>

          <input
            v-model.number="data.baseline_samples"
            :disabled="data.is_mlp_enabled"
            type="number"
            class="w-full bg-gray-700 p-1 focus:outline-none disabled:text-gray-400"
          />
        </div>
      </div>

      <hr class="my-2 border-gray-700" />

      <!-- interpolation -->
      <div class="grid grid-cols-2 gap-x-4">
        <div>
          <label class="block">Interpolation resolution</label>
          <input
            v-model.number="data.interp_res"
            type="number"
            step="0.01"
            class="w-full bg-gray-700 p-1 focus:outline-none"
          />
        </div>
        <div>
          <label class="block">IDW power</label>
          <input
            v-model.number="data.idw_power"
            type="number"
            class="w-full bg-gray-700 p-1 focus:outline-none"
          />
        </div>
        <div>
          <label class="block">IDW near</label>
          <input
            v-model.number="data.idw_near"
            type="number"
            class="w-full bg-gray-700 p-1 focus:outline-none"
          />
        </div>
        <div>
          <label class="block">IDW distance</label>
          <input
            v-model.number="data.idw_dist"
            type="number"
            class="w-full bg-gray-700 p-1 focus:outline-none"
          />
        </div>
      </div>

      <hr class="my-2 border-gray-700" />
      <!-- crop -->
      <div>
        <label class="block">Enable crop</label>
        <input v-model="data.is_crop_enabled" type="checkbox" />
      </div>
    </div>

    <!-- submit -->
    <button
      @click="startRainCalculation"
      class="mt-2 h-8 cursor-pointer rounded bg-cyan-600 px-3 text-base text-white hover:bg-cyan-700"
    >
      Start calculation
    </button>
  </div>
</template>
