<script setup lang="ts">
import axios from 'axios'

import { api } from '@/api'
import getSecureConfig from '@/cookies'
import { useRoute, useRouter } from 'vue-router'

import { useActiveLayer } from '@/composables/useActiveLayer'
import { useTokenCountdown } from '@/composables/useTokenCountdown'

import { useAuthStore } from '@/stores/auth'
import { useCmlDataStore } from '@/stores/cmlData'
import { useConfigStore } from '@/stores/config'
import { useLinksStore } from '@/stores/links'
import { useWeatherDataStore } from '@/stores/weatherData'
import { useWeatherStationsStore } from '@/stores/weatherStations'
import { resetSessionState } from '@/utils/resetSessionState'

import AdminPanel from '@/components/AdminPanel.vue'
import DatetimeToggle from '@/components/DatetimeToggle.vue'

import { Icon } from '@iconify/vue'
import { onClickOutside } from '@vueuse/core'
import { computed, ref, useTemplateRef, watchEffect } from 'vue'

const TOKEN_WARNING_SECONDS = 15 * 60

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const weatherStations = useWeatherStationsStore()
const links = useLinksStore()
const weatherData = useWeatherDataStore()
const cmlData = useCmlDataStore()
const config = useConfigStore()

const { clearMainLayer, clearSecondaryLayer } = useActiveLayer()
const { remainingTime, resetRemaining } = useTokenCountdown()

const expiryWarning = computed(() => {
  if (!auth.isLoggedIn) return ''
  if (remainingTime.value === null || remainingTime.value > TOKEN_WARNING_SECONDS) {
    return ''
  }

  const minutesLeft = Math.max(1, Math.ceil(remainingTime.value / 60))
  return `Token expires in about ${minutesLeft} min unless another request refreshes it.`
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
    const res = await api.post('/logout', {}, getSecureConfig())
    if (res.data.message === 'Logout successful') {
      adminPanelVisible.value = false
      resetSessionState()
      resetRemaining()
      await router.push({ name: 'home' })
    }
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      console.error('Caught error:', err.response.data.message)
      adminPanelVisible.value = false
      resetSessionState()
      resetRemaining()
      await router.push({ name: 'login' })
    } else {
      console.error('Unknown error:', err)
    }
  }
}

function pushToLogin() {
  adminPanelVisible.value = false
  resetData()
  router.push({ name: 'login' })
}

function pushToHome() {
  adminPanelVisible.value = false
  resetData()
  router.push({ name: 'home' })
}

function toggleRoute() {
  adminPanelVisible.value = false
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
const adminPanelVisible = ref(false)
const profileMenuWrapper = useTemplateRef<HTMLElement>('profileMenuWrapper')

onClickOutside(profileMenuWrapper, () => {
  menuVisible.value = false
})

function toggleAdminPanel() {
  adminPanelVisible.value = !adminPanelVisible.value
  menuVisible.value = false
}
</script>

<template>
  <nav class="absolute top-1 z-10 flex h-12 w-full items-center justify-between px-3">

    <div class="flex gap-x-3">

      <span @click="toggleRoute"
        class="flex h-8 items-center justify-center rounded-md text-xl font-semibold text-gray-900 select-none mr-3 cursor-pointer hover:text-gray-700">
        {{ routeLabel }}
      </span>

      <slot></slot>
    </div>

    <div class="flex items-center gap-x-2 rounded-md text-white">
      <DatetimeToggle />

      <div ref="profileMenuWrapper" class="relative">
        <Icon icon="iconamoon:profile-circle-light" width="38" height="38"
          class="cursor-pointer text-gray-900 hover:text-gray-700" @click="menuVisible = !menuVisible" />

        <div v-if="menuVisible"
          class="absolute top-[calc(3rem-1px)] right-0 z-50 flex w-64 flex-col gap-y-2.5 rounded-md border border-gray-600 bg-gray-800/60 p-2.5 shadow-lg shadow-black/20 backdrop-blur-xs">
          <div class="border-b border-gray-400/70 pb-2 text-sm text-white select-none">
            <div v-if="auth.username" class="font-medium text-white">
              {{ auth.username }}
            </div>
            <div v-if="auth.username" class="text-xs text-gray-300">
              {{ auth.org }}
            </div>
            <div v-else class="text-gray-200">Not logged in</div>
          </div>

          <div v-if="auth.isLoggedIn && expiryWarning"
            class="rounded-md border border-amber-300/30 bg-amber-500/10 px-2.5 py-2 text-xs leading-relaxed text-amber-100">
            {{ expiryWarning }}
          </div>

          <div class="flex flex-col gap-y-2">
            <slot name="settings">

            </slot>
          </div>

          <button
            v-if="auth.canManageUsers"
            @click="toggleAdminPanel()"
            class="cursor-pointer rounded-md px-1 text-left text-sm text-white select-none hover:underline"
          >
            {{ adminPanelVisible ? 'Hide admin panel' : 'Admin panel' }}
          </button>

          <button v-if="!auth.isLoggedIn" @click="pushToHome()"
            class="cursor-pointer rounded-md px-1 text-left text-sm text-white select-none hover:underline">
            Home page
          </button>

          <button v-if="auth.isLoggedIn" @click="logout()"
            class="h-8 w-full cursor-pointer rounded-md bg-cyan-600 px-3 text-sm font-medium text-white select-none transition hover:bg-cyan-700">
            Log out
          </button>
          <button v-else @click="pushToLogin()"
            class="h-8 w-full cursor-pointer rounded-md bg-cyan-600 px-3 text-sm font-medium text-white select-none transition hover:bg-cyan-700">
            Log in
          </button>
        </div>
      </div>
    </div>
    <AdminPanel v-if="auth.canManageUsers && adminPanelVisible" @close="adminPanelVisible = false" />
    <!-- </div> -->
  </nav>
</template>
