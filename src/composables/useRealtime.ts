import { computed, onMounted, onUnmounted, ref } from 'vue'

export function useRealtime(updateIntervalMinutes = 1) {
  const currentTimestamp = ref('')
  const oneWeekAgoTimestamp = ref('')
  const secondsUntilNextUpdate = ref(0)

  let intervalId: ReturnType<typeof setInterval> | null = null
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let countdownIntervalId: ReturnType<typeof setInterval> | null = null

  function getAlignedTime(now = new Date()) {
    const intervalMs = updateIntervalMinutes * 60 * 1000
    const baseTime = Math.floor(now.getTime() / intervalMs) * intervalMs
    return new Date(baseTime)
  }

  function getNextAlignedTime(now = new Date()) {
    const intervalMs = updateIntervalMinutes * 60 * 1000
    const baseTime = Math.ceil(now.getTime() / intervalMs) * intervalMs
    return new Date(baseTime)
  }

  function updateTimestamps(alignedDate = new Date()) {
    currentTimestamp.value = alignedDate.toISOString()

    const oneWeekAgo = new Date(alignedDate)
    oneWeekAgo.setUTCDate(alignedDate.getUTCDate() - 7)
    oneWeekAgoTimestamp.value = oneWeekAgo.toISOString()
  }

  function alignToInterval() {
    const now = new Date()
    const nextAligned = getNextAlignedTime(now)
    const delay = nextAligned.getTime() - now.getTime()

    timeoutId = setTimeout(() => {
      const updateTime = getAlignedTime(new Date())
      updateTimestamps(updateTime)

      intervalId = setInterval(
        () => {
          const updateTime = getAlignedTime(new Date())
          updateTimestamps(updateTime)
        },
        updateIntervalMinutes * 60 * 1000,
      )
    }, delay)
  }

  function startCountdownTimer() {
    countdownIntervalId = setInterval(() => {
      const now = new Date()
      const nextUpdate = getNextAlignedTime(now)
      const diffMs = nextUpdate.getTime() - now.getTime()
      secondsUntilNextUpdate.value = Math.max(0, Math.floor(diffMs / 1000))
    }, 1000)
  }

  const formattedCountdown = computed(() => {
    const minutes = Math.floor(secondsUntilNextUpdate.value / 60)
    const seconds = secondsUntilNextUpdate.value % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  })

  onMounted(() => {
    const initialAligned = getAlignedTime(new Date())
    updateTimestamps(initialAligned)
    alignToInterval()
    startCountdownTimer()
  })

  onUnmounted(() => {
    clearTimeout(timeoutId!)
    clearInterval(intervalId!)
    clearInterval(countdownIntervalId!)
  })

  return {
    currentTimestamp,
    oneWeekAgoTimestamp,
    formattedCountdown,
  }
}
