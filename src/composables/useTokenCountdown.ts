import { useAuthStore } from '@/stores/auth'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

export function useTokenCountdown(pollInterval = 30000) {
  const auth = useAuthStore()
  const router = useRouter()

  const remainingTime = ref<number | null>(null)

  let countdownInterval: ReturnType<typeof setInterval>
  let pollingInterval: ReturnType<typeof setInterval>

  const updateRemaining = () => {
    if (auth.tokenExpiry) {
      const now = Math.floor(Date.now() / 1000)
      const delta = auth.tokenExpiry - now
      remainingTime.value = delta > 0 ? delta : 0
    } else {
      remainingTime.value = null
    }
  }

  const pollTokenStatus = async () => {
    await auth.checkLogin()
  }

  watch(remainingTime, (time) => {
    if (time === 0) {
      auth.reset()
      router.push({ name: 'login' })
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
  }
}