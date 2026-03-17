import { useAuthStore } from '@/stores/auth'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { resetSessionState } from '@/utils/resetSessionState'

export function useTokenCountdown(pollInterval = 300000) {
  const auth = useAuthStore()
  const router = useRouter()

  const remainingTime = ref<number | null>(null)

  let countdownInterval: ReturnType<typeof setInterval>
  let pollingInterval: ReturnType<typeof setInterval>

  function performLogout() {
    resetSessionState()
    remainingTime.value = null
    void router.push({ name: 'login' })
  }

  function updateRemaining() {
    if (!auth.isLoggedIn) {
      remainingTime.value = null
      return
    }

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
  watch(() => auth.isLoggedIn, updateRemaining)

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
