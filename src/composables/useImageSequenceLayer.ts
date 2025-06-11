import { api } from '@/api'
import L from 'leaflet'
import { markRaw, ref, shallowRef } from 'vue'

export interface Frame {
  timestamp: string
  url: string
  objectUrl: string | null
}

export function useImageSequenceLayer(config: {
  apiUrl: string
  bounds: L.LatLngBounds
}) {
  const frames = shallowRef<Frame[]>([])
  const blobCache = new Map<string, string>()

  const map = ref<L.Map | null>(null)
  const overlay = ref<L.ImageOverlay | null>(null)

  const currentIndex = ref(0)
  const isPlaying = ref(false)
  const playbackTimer = ref<number | null>(null)
  const animationSpeed = ref(150)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const frameLoading = ref(false)
  const opacity = ref(0.5)

  let preloadInProgress = false
  let currentAbort: AbortController | null = null

  function setMap(newMap: L.Map) {
    map.value = markRaw(newMap)
  }

  function setOpacity(value: number) {
    opacity.value = value
    overlay.value?.setOpacity(value)
  }

  function setVisible(visible: boolean) {
    if (map.value && overlay.value) {
      if (visible) overlay.value.addTo(map.value as L.Map)
      else map.value.removeLayer(overlay.value as L.ImageOverlay)
    }
  }

  async function fetchList(start: string, end: string) {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<Frame[]>(config.apiUrl, {
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
          L.imageOverlay(objectUrl, config.bounds, { opacity: opacity.value }).addTo(map.value as L.Map)
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

  async function preloadWindow(centerIndex: number, range = 25) {
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

      const res = await api.get<Frame[]>(config.apiUrl, {
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

  return {
    frames,
    currentIndex,
    isPlaying,
    frameLoading,
    loading,
    error,
    animationSpeed,
    opacity,

    setMap,
    setVisible,
    setOpacity,
    fetchList,
    showFrame,
    changeFrame,
    preloadWindow,
    fetchLatestFrame,
    play,
    pause,
    toggle,
    releaseBlobs
  }
}

export type ImageSequenceLayer = ReturnType<typeof useImageSequenceLayer>
