<script setup lang="ts">
import axios from 'axios'

import { api } from '@/api'
import { useRouter } from 'vue-router'

import { useActiveLayer } from '@/composables/useActiveLayer'

import { useAuthStore } from '@/stores/auth'
import { useLinksStore } from '@/stores/links'
import { useMaxzStore } from '@/stores/maxz'
import { useMerge1hStore } from '@/stores/merge1h'
import { useWeatherStationsStore } from '@/stores/weatherStations'

const router = useRouter()
const auth = useAuthStore()

const weatherStations = useWeatherStationsStore()
const links = useLinksStore()
const maxz = useMaxzStore()
const merge1h = useMerge1hStore()

const { clearLayer } = useActiveLayer()

async function logout() {
  try {
    const res = await api.post('/logout')
    if (res.data.message === 'Logout successful') {
      await auth.checkLogin()
      weatherStations.$reset()
      links.$reset()

      // reset map layers
      clearLayer()
      maxz.$reset()
      merge1h.$reset()

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
      <span
        class="flex h-8 items-center rounded-md border border-gray-700 bg-gray-300 px-3 font-semibold text-gray-800"
        >{{ auth.username }}</span
      >

      <button
        @click="logout()"
        class="h-8 w-full cursor-pointer rounded-md bg-cyan-600 px-3 text-white hover:bg-cyan-700"
      >
        Log out
      </button>
    </div>
  </nav>
</template>
