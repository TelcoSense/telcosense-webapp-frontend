import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDeviceStore = defineStore('device', () => {
  const isMobile = ref(false)

  function updateDevice() {
    isMobile.value = window.innerWidth <= 768
  }

  function startTracking() {
    updateDevice()
    window.addEventListener('resize', updateDevice)
  }

  function stopTracking() {
    window.removeEventListener('resize', updateDevice)
  }

  return {
    isMobile,
    startTracking,
    stopTracking,
  }
})
