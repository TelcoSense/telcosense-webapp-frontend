import { useAuthStore } from '@/stores/auth'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useCmlDataStore } from '@/stores/cmlData'
import { useConfigStore } from '@/stores/config'
import { useLinksStore } from '@/stores/links'
import { useWeatherDataStore } from '@/stores/weatherData'
import { useWeatherStationsStore } from '@/stores/weatherStations'
import { useActiveLayer } from './useActiveLayer'

export function useTokenCountdown(pollInterval = 30000) {
  const auth = useAuthStore()
  const router = useRouter()

  const remainingTime = ref<number | null>(null)

  let countdownInterval: ReturnType<typeof setInterval>
  let pollingInterval: ReturnType<typeof setInterval>

  function performLogout() {
    auth.reset()

    useWeatherStationsStore().$reset()
    useWeatherDataStore().$reset()
    useLinksStore().$reset()
    useCmlDataStore().$reset()
    useConfigStore().$reset()
    useActiveLayer().clearMainLayer()
    useActiveLayer().clearSecondaryLayer()
    remainingTime.value = null
    router.push({ name: 'login' })
  }

  function updateRemaining() {
    const expiry = auth.tokenExpiry
    if (expiry) {
      const now = Math.floor(Date.now() / 1000)
      const delta = expiry - now
      remainingTime.value = Math.max(delta, 0)
    } else {
      remainingTime.value = null
    }
  }

  function resetRemaining() {
    remainingTime.value = null
  }

  async function pollTokenStatus() {
    try {
      const valid = await auth.checkLogin()
      if (!valid) throw new Error('Invalid token')
    } catch (err) {
      console.warn('Token polling failed:', err)
      if (auth.isLoggedIn) performLogout()
    }
  }

  watch(() => auth.tokenExpiry, updateRemaining)

  watch(remainingTime, (seconds) => {
    if (seconds !== null && seconds <= 0) {
      performLogout()
    }
  })

  onMounted(() => {
    updateRemaining()
    countdownInterval = setInterval(updateRemaining, 1000)
    pollingInterval = setInterval(pollTokenStatus, pollInterval)
  })

  onUnmounted(() => {
    clearInterval(countdownInterval)
    clearInterval(pollingInterval)
  })

  return {
    remainingTime: computed(() => remainingTime.value),
    resetRemaining
  }
}