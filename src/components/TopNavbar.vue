<script setup lang="ts">
import { api } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useWeatherStationsStore } from '@/stores/weatherStations'
import { useLinksStore } from '@/stores/links'

const router = useRouter()
const auth = useAuthStore()
const links = useLinksStore()
const weatherStations = useWeatherStationsStore()

async function logout() {
  try {
    const res = await api.post('/logout')
    if (res.data.message === 'Logout successful') {
      await auth.checkLogin()
      links.$reset()
      weatherStations.$reset()
      router.push({ name: 'login' })
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error('Caught error:', err.response.data.message)
      alert(err.response.data.message)
    } else {
      console.error('Unknown error:', err)
    }
  }
}
</script>

<template>
  <nav class="h-16 bg-gray-800 px-6 text-gray-100">
    <div class="flex h-full items-center justify-between">
      <div class="text-xl">TelcoSense</div>
      <div class="flex">
        <span class="font-semibold">{{ auth.username }}</span>
        <button @click="logout()" class="ml-1 cursor-pointer hover:underline">Log out</button>
      </div>
    </div>
  </nav>
</template>
