<script setup lang="ts">
import axios from 'axios'

import { api } from '@/api'
import { useRoute, useRouter } from 'vue-router'

import { useActiveLayer } from '@/composables/useActiveLayer'
import { useTokenCountdown } from '@/composables/useTokenCountdown'

import { useAuthStore } from '@/stores/auth'
import { useCmlDataStore } from '@/stores/cmlData'
import { useConfigStore } from '@/stores/config'
import { useLinksStore } from '@/stores/links'
import { useWeatherDataStore } from '@/stores/weatherData'
import { useWeatherStationsStore } from '@/stores/weatherStations'

import DatetimeToggle from '@/components/DatetimeToggle.vue'

import { Icon } from '@iconify/vue'
import { onClickOutside } from '@vueuse/core'
import { computed, ref, useTemplateRef } from 'vue'

const SESSION_MAX_SECONDS = 1800 // 30 minutes

const router = useRouter()
const route = useRoute()
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

function resetData() {
  weatherStations.$reset()
  weatherData.$reset()
  links.$reset()
  cmlData.$reset()
  config.$reset()
  clearLayer()
}

async function logout() {
  try {
    const res = await api.post('/logout')
    if (res.data.message === 'Logout successful') {
      await auth.checkLogin()
      resetData()
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

function toggleRoute() {
  if (route.name === 'rain') {
    config.realtime = true
    resetData()
    router.push({ name: 'temp' })
  } else {
    resetData()
    config.realtime = true
    router.push({ name: 'rain' })
  }
}

const menuVisible = ref(false)
const profileMenuWrapper = useTemplateRef<HTMLElement>('profileMenuWrapper')

onClickOutside(profileMenuWrapper, () => {
  menuVisible.value = false
})
</script>

<template>
  <nav class="absolute top-1 z-10 flex h-12 w-full items-center justify-between px-3">
    <span
      class="flex h-8 cursor-pointer items-center justify-center rounded-md text-xl font-semibold text-gray-900 transition select-none hover:text-gray-700"
      @click="toggleRoute"
    >
      TelcoSense
    </span>

    <div class="flex gap-x-3">
      <slot></slot>
    </div>

    <div class="flex items-center gap-x-2 rounded-md text-white">
      <DatetimeToggle />

      <div ref="profileMenuWrapper" class="relative">
        <Icon
          icon="iconamoon:profile-circle-light"
          width="38"
          height="38"
          class="cursor-pointer text-gray-900 hover:text-gray-700"
          @click="menuVisible = !menuVisible"
        />

        <div
          v-if="menuVisible"
          class="absolute top-12 right-0 z-50 flex w-58 flex-col gap-y-2 rounded-md border border-gray-600 bg-gray-800/60 p-2 backdrop-blur-xs"
        >
          <span
            class="flex w-full border-b border-gray-400 pb-1.5 text-sm text-nowrap text-white select-none"
          >
            {{ `${auth.username} (${auth.org})` }}
          </span>

          <div
            v-if="formattedTime"
            class="flex h-8 flex-col items-center justify-center px-2 text-nowrap"
          >
            <div class="text-center text-xs text-white">
              <span class="font-chivo">{{ formattedTime }}</span> min left
            </div>
            <div class="h-2 w-full overflow-hidden rounded bg-gray-600">
              <div class="h-2 bg-cyan-500" :style="{ width: progressBarWidth }"></div>
            </div>
          </div>

          <button
            @click="logout()"
            class="h-8 w-full cursor-pointer rounded-md bg-cyan-600 px-3 text-sm text-white select-none hover:bg-cyan-700"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>
