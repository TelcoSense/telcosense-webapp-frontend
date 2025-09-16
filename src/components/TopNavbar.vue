<script setup lang="ts">
import axios from 'axios'

import { api } from '@/api'
import { useRouter } from 'vue-router'

import { useActiveLayer } from '@/composables/useActiveLayer'
import { useTokenCountdown } from '@/composables/useTokenCountdown'

import { useAuthStore } from '@/stores/auth'
import { useCmlDataStore } from '@/stores/cmlData'
import { useConfigStore } from '@/stores/config'
import { useLinksStore } from '@/stores/links'
import { useWeatherDataStore } from '@/stores/weatherData'
import { useWeatherStationsStore } from '@/stores/weatherStations'

import { computed } from 'vue'

import DatetimeToggle from '@/components/DatetimeToggle.vue'

const SESSION_MAX_SECONDS = 1800 // 30 minutes

const router = useRouter()
const auth = useAuthStore()

const weatherStations = useWeatherStationsStore()
const links = useLinksStore()
const weatherData = useWeatherDataStore()
const cmlData = useCmlDataStore()
const config = useConfigStore()

const { clearLayer } = useActiveLayer()
const { remainingTime } = useTokenCountdown()

const formattedTime = computed(() => {
  if (remainingTime.value === null) return ''
  return Math.floor(remainingTime.value / 60).toString()
})

const progressBarWidth = computed(() => {
  if (remainingTime.value === null) return '0%'
  const used = SESSION_MAX_SECONDS - remainingTime.value
  const percentage = Math.min(100 - (used / SESSION_MAX_SECONDS) * 100, 100)
  return `${percentage}%`
})

async function logout() {
  try {
    const res = await api.post('/logout')
    if (res.data.message === 'Logout successful') {
      await auth.checkLogin()
      weatherStations.$reset()
      weatherData.$reset()

      links.$reset()
      cmlData.$reset()
      config.$reset()

      // reset map layer
      clearLayer()

      router.push({ name: 'login' })
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
</script>

<template>
  <nav class="absolute top-6 z-10 flex w-full items-end justify-between px-6">
    <span
      class="flex h-8 items-center justify-center rounded-md bg-gray-800 px-3 text-xl text-white select-none"
      >TelcoSense</span
    >

    <div class="flex gap-x-3">
      <slot></slot>
    </div>

    <div class="flex items-center gap-x-3 rounded-md text-white">
      <DatetimeToggle />
      <!-- time left -->
      <div
        v-if="formattedTime"
        class="flex h-8 flex-col items-center justify-center rounded-md bg-gray-800 px-2 text-nowrap"
      >
        <div class="text-center text-xs text-white">{{ formattedTime }} min left</div>
        <div class="h-2 w-full overflow-hidden rounded bg-gray-600">
          <div class="h-2 bg-blue-500" :style="{ width: progressBarWidth }"></div>
        </div>
      </div>
      <!-- time left end -->
      <span
        class="flex h-8 items-center rounded-md border border-gray-700 bg-gray-300 px-3 font-semibold text-nowrap text-gray-800"
      >
        {{ `${auth.username} (${auth.org})` }}
      </span>

      <button
        @click="logout()"
        class="h-8 w-full cursor-pointer rounded-md bg-cyan-600 px-3 text-white hover:bg-cyan-700"
      >
        Log out
      </button>
    </div>
  </nav>
</template>
