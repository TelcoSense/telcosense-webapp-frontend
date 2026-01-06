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
import { computed, ref, useTemplateRef, watchEffect } from 'vue'

const SESSION_MAX_SECONDS = 1800 // 30 minutes

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const weatherStations = useWeatherStationsStore()
const links = useLinksStore()
const weatherData = useWeatherDataStore()
const cmlData = useCmlDataStore()
const config = useConfigStore()

const { clearMainLayer, clearSecondaryLayer } = useActiveLayer()
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
  clearMainLayer()
  clearSecondaryLayer()
}

async function logout() {
  try {
    const res = await api.post('/logout')
    if (res.data.message === 'Logout successful') {
      await auth.checkLogin()
      resetData()
      router.push({ name: 'home' })
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

function pushToLogin() {
  router.push({ name: 'login' })
}

function toggleRoute() {
  if (route.name === 'rain') {
    resetData()
    config.realtime = true
    router.push({ name: 'temp' })
  } else {
    resetData()
    config.realtime = true
    router.push({ name: 'rain' })
  }
}

const routeLabel = computed(() => {
  if (route.name === 'rain') return 'TelcoRain'
  if (route.name === 'temp') return 'TelcoTemp'
  return ''
})

watchEffect(() => {
  document.title = routeLabel.value
})

const menuVisible = ref(false)
const profileMenuWrapper = useTemplateRef<HTMLElement>('profileMenuWrapper')

onClickOutside(profileMenuWrapper, () => {
  menuVisible.value = false
})
</script>

<template>
  <nav class="absolute top-1 z-10 flex h-12 w-full items-center justify-between px-3">

    <div class="flex gap-x-3">

      <span @click="toggleRoute"
        class="flex h-8 items-center justify-center rounded-md text-xl font-semibold text-gray-900 select-none mr-3 cursor-pointer hover:text-gray-700">
        {{ routeLabel }}
      </span>
      <!-- <span v-else
        class="flex h-8 items-center justify-center rounded-md text-xl font-semibold text-gray-900 select-none mr-3">
        {{ routeLabel }}
      </span> -->



      <slot></slot>
    </div>

    <div class="flex items-center gap-x-2 rounded-md text-white">
      <DatetimeToggle />

      <div ref="profileMenuWrapper" class="relative">
        <Icon icon="iconamoon:profile-circle-light" width="38" height="38"
          class="cursor-pointer text-gray-900 hover:text-gray-700" @click="menuVisible = !menuVisible" />

        <div v-if="menuVisible"
          class="absolute top-[calc(3rem-1px)] right-0 z-50 flex w-58 flex-col gap-y-2 rounded-md border border-gray-600 bg-gray-800/60 p-2 backdrop-blur-xs">
          <span class="flex w-full border-b border-gray-400 pb-1.5 text-sm text-nowrap text-white select-none">
            <div v-if="auth.username">{{ `${auth.username} (${auth.org})` }}</div>
            <div v-else>Not logged in</div>
          </span>

          <div v-if="formattedTime" class="flex h-8 flex-col items-center justify-center px-2 text-nowrap ">
            <div class="text-center text-xs text-white">
              <span class="font-chivo">{{ formattedTime }}</span> min left
            </div>
            <div class="h-2 w-full overflow-hidden rounded bg-gray-600">
              <div class="h-2 bg-cyan-500" :style="{ width: progressBarWidth }"></div>
            </div>
          </div>

          <slot name="settings">

          </slot>

          <button v-if="auth.isLoggedIn" @click="logout()"
            class="h-8 w-full cursor-pointer rounded-md bg-cyan-600 px-3 text-sm text-white select-none hover:bg-cyan-700">
            Log out
          </button>
          <button v-else @click="pushToLogin()"
            class="h-8 w-full cursor-pointer rounded-md bg-cyan-600 px-3 text-sm text-white select-none hover:bg-cyan-700">
            Log in
          </button>
        </div>
      </div>
    </div>
    <!-- </div> -->
  </nav>
</template>
