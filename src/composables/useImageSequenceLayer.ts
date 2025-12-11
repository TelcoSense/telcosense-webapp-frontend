import { api } from '@/api'
import L from 'leaflet'
import { computed, markRaw, ref, shallowRef } from 'vue'



export interface Frame {
  timestamp: string
  url: string
  objectUrl: string | null
  rain_score?: number
}

export function useImageSequenceLayer(initialConfig: {
  apiUrl: string
  bounds: L.LatLngBounds
}) {
  const apiUrl = ref(initialConfig.apiUrl)
  const bounds = ref(initialConfig.bounds)

  const frames = shallowRef<Frame[]>([])
  const blobCache = new Map<string, string>()

  const map = ref<L.Map | null>(null)
  const overlay = ref<L.ImageOverlay | null>(null)

  const currentIndex = ref(0)
  const isPlaying = ref(false)
  const playbackTimer = ref<number | null>(null)
  const animationSpeed = ref(1000)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const frameLoading = ref(false)
  const opacity = ref(0.5)

  const currentTimestamp = computed(() => frames.value[currentIndex.value]?.timestamp ?? null)

  let preloadInProgress = false
  let currentAbort: AbortController | null = null

  function setApiUrl(newUrl: string) {
    apiUrl.value = newUrl
  }

  function setBounds(newBounds: L.LatLngBounds) {
    bounds.value = newBounds
    if (overlay.value) {
      overlay.value.setBounds(newBounds)
    }
  }

  function setMap(newMap: L.Map) {
    map.value = markRaw(newMap)
  }

  function setOpacity(value: number) {
    opacity.value = value
    overlay.value?.setOpacity(value)
  }

  function setAnimationSpeed(value: number) {
    animationSpeed.value = value
    // need to pause/play to make it work during playback
    if (isPlaying.value) {
      pause()
      play()
    }
  }

  function setVisible(visible: boolean) {
    if (map.value && overlay.value) {
      if (visible) overlay.value.addTo(map.value as L.Map)
      else map.value.removeLayer(overlay.value as L.ImageOverlay)
    }
  }

  async function fetchList(start: string | null, end: string | null) {
    if (!start || !end) return
    loading.value = true
    error.value = null
    try {
      const res = await api.get<Frame[]>(apiUrl.value, {
        params: { start, end }
      })
      frames.value = res.data
      blobCache.clear()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Frame fetch error:', err)
    } finally {
      loading.value = false
    }
  }

  async function showFrame(index: number) {
    if (!map.value || !frames.value.length) return
    const frame = frames.value[index]
    if (!frame) return

    frameLoading.value = true

    try {
      let objectUrl = blobCache.get(frame.timestamp)
      if (!objectUrl) {
        const res = await api.get(frame.url, { responseType: 'blob' })
        objectUrl = URL.createObjectURL(res.data as Blob)
        blobCache.set(frame.timestamp, objectUrl)
      }

      if (!overlay.value) {
        overlay.value = markRaw(
          L.imageOverlay(objectUrl, bounds.value, { opacity: opacity.value }).addTo(map.value as L.Map)
        )
      } else {
        overlay.value.setUrl(objectUrl)
      }

      currentIndex.value = index

      // Preload nearby
      if (!preloadInProgress) {
        preloadWindow(index, 25)
      }
    } catch (err) {
      console.error('Failed to show frame:', err)
    } finally {
      frameLoading.value = false
    }
  }

  async function preloadWindow(centerIndex: number, range = 100) {
    preloadInProgress = true

    const start = Math.max(0, centerIndex - range)
    const end = Math.min(frames.value.length, centerIndex + range)

    const preloadFrames = frames.value.slice(start, end)

    await Promise.all(
      preloadFrames.map(async (frame) => {
        if (!blobCache.has(frame.timestamp)) {
          try {
            const res = await api.get(frame.url, { responseType: 'blob' })
            const objectUrl = URL.createObjectURL(res.data as Blob)
            blobCache.set(frame.timestamp, objectUrl)
          } catch (err) {
            console.error(`Preload failed for ${frame.timestamp}`, err)
          }
        }
      })
    )

    // Clean up distant blobs to save memory
    for (const [ts, url] of blobCache.entries()) {
      const index = frames.value.findIndex((f) => f.timestamp === ts)
      if (Math.abs(index - centerIndex) > range * 2) {
        URL.revokeObjectURL(url)
        blobCache.delete(ts)
      }
    }

    preloadInProgress = false
  }

  async function fetchLatestFrame(newTimestamp: string) {
    const lastFrame = frames.value[frames.value.length - 1]
    if (new Date(newTimestamp) <= new Date(lastFrame.timestamp)) return

    try {
      currentAbort?.abort()
      currentAbort = new AbortController()

      const res = await api.get<Frame[]>(apiUrl.value, {
        params: { start: newTimestamp, end: newTimestamp },
        signal: currentAbort.signal
      })

      if (!res.data.length) return

      const newFrame = res.data[0]
      const blobRes = await api.get(newFrame.url, { responseType: 'blob' })
      const objectUrl = URL.createObjectURL(blobRes.data as Blob)

      blobCache.set(newFrame.timestamp, objectUrl)

      const removed = frames.value.shift()
      if (removed?.timestamp) {
        const oldUrl = blobCache.get(removed.timestamp)
        if (oldUrl) URL.revokeObjectURL(oldUrl)
        blobCache.delete(removed.timestamp)
      }

      frames.value.push(newFrame)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      console.error('Fetch latest frame error:', err)
    }
  }

  function changeFrame(delta: number) {
    const newIndex = currentIndex.value + delta
    if (newIndex >= 0 && newIndex < frames.value.length) {
      showFrame(newIndex)
    }
  }

  function play() {
    if (isPlaying.value || !frames.value.length) return
    isPlaying.value = true
    playbackTimer.value = window.setInterval(() => {
      const next = (currentIndex.value + 1) % frames.value.length
      showFrame(next)
    }, animationSpeed.value)
  }

  function pause() {
    isPlaying.value = false
    if (playbackTimer.value !== null) {
      clearInterval(playbackTimer.value)
      playbackTimer.value = null
    }
  }

  function toggle() {
    if (isPlaying.value) pause()
    else play()
  }

  function releaseBlobs() {
    for (const url of blobCache.values()) {
      URL.revokeObjectURL(url)
    }
    blobCache.clear()
  }

  function findClosestIndex(ts: string) {
    if (!frames.value.length) return -1
    const target = new Date(ts).getTime()
    let lo = 0, hi = frames.value.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const midTs = new Date(frames.value[mid].timestamp).getTime()
      if (midTs === target) return mid
      if (midTs < target) lo = mid + 1
      else hi = mid - 1
    }
    if (lo >= frames.value.length) return frames.value.length - 1
    if (hi < 0) return 0
    const loDiff = Math.abs(new Date(frames.value[lo].timestamp).getTime() - target)
    const hiDiff = Math.abs(new Date(frames.value[hi].timestamp).getTime() - target)
    return loDiff < hiDiff ? lo : hi
  }

  async function showNearestTimestamp(ts: string) {
    const idx = findClosestIndex(ts)
    if (idx >= 0) await showFrame(idx)
  }

  function clear() {
    pause() // stop playback

    // Remove overlay from map
    if (overlay.value && map.value) {
      map.value.removeLayer(overlay.value as L.ImageOverlay)
    }

    // Revoke and clear blobs
    releaseBlobs()

    // Reset everything
    overlay.value = null
    frames.value = []
    currentIndex.value = 0
    error.value = null
  }


  return {
    frames,
    currentIndex,
    isPlaying,
    frameLoading,
    loading,
    error,
    animationSpeed,
    opacity,
    currentTimestamp,

    setMap,
    setVisible,
    setOpacity,
    setAnimationSpeed,
    fetchList,
    showFrame,
    changeFrame,
    preloadWindow,
    fetchLatestFrame,
    play,
    pause,
    toggle,
    releaseBlobs,
    showNearestTimestamp,
    clear,
    setApiUrl,
    setBounds,
  }
}

export type ImageSequenceLayer = ReturnType<typeof useImageSequenceLayer>
