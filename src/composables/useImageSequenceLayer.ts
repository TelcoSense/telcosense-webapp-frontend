import { api } from '@/api'
import L from 'leaflet'
import { computed, markRaw, ref, shallowRef } from 'vue'

export interface Frame {
  timestamp: string
  url: string
  objectUrl: string | null
  rain_score?: number
}

type CacheEntry = {
  objectUrl: string
  index: number
  lastUsed: number
}

/**
 * - Preloading uses a queue with concurrency limit (no Promise.all stampede)
 * - Preload is cancelable and deprioritized vs showFrame()
 * - showFrame is race-safe (stale requests ignored), and aborts prior showFrame fetch
 * - Playback does not overlap showFrame calls (awaited loop instead of setInterval)
 * - Fast closest-index lookup via precomputed timestampMs[]
 * - Cache eviction via simple LRU-ish policy with maxCacheItems
 */

export function useImageSequenceLayer(initialConfig: { apiUrl: string; bounds: L.LatLngBounds }) {
  const apiUrl = ref(initialConfig.apiUrl)
  const bounds = ref(initialConfig.bounds)

  const frames = shallowRef<Frame[]>([])
  const timestampMs = shallowRef<number[]>([])

  // cache key = frame.timestamp
  const blobCache = new Map<string, CacheEntry>()
  const maxCacheItems = 500 // tune for memory vs smoothness

  const map = ref<L.Map | null>(null)
  const overlay = ref<L.ImageOverlay | null>(null)

  const currentIndex = ref(0)
  const isPlaying = ref(false)
  const playbackTimer = ref<number | null>(null) // kept for compatibility (no longer used)
  const animationSpeed = ref(1000)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const frameLoading = ref(false)
  const opacity = ref(0.5)

  const currentTimestamp = computed(() => frames.value[currentIndex.value]?.timestamp ?? null)

  // ---- request + preload control ----
  let showReqId = 0
  let showAbort: AbortController | null = null

  let preloadAbort: AbortController | null = null
  let preloadRunning = 0
  const preloadQueue: number[] = []
  const preloadQueued = new Set<number>()
  const preloadConcurrency = 4

  // playback token to cancel loop
  let playToken = 0

  function setApiUrl(newUrl: string) {
    apiUrl.value = newUrl
  }

  function setBounds(newBounds: L.LatLngBounds) {
    bounds.value = newBounds
    if (overlay.value) overlay.value.setBounds(newBounds)
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
    // no pause/play needed anymore; playback loop reads latest value
  }

  function setVisible(visible: boolean) {
    if (!map.value || !overlay.value) return
    if (visible) overlay.value.addTo(map.value as L.Map)
    else map.value.removeLayer(overlay.value as L.ImageOverlay)
  }

  async function fetchList(start: string | null, end: string | null) {
    if (!start || !end) return
    loading.value = true
    error.value = null

    // stop any in-flight work
    pause()
    stopPreload()
    showAbort?.abort()
    showAbort = null

    try {
      const res = await api.get<Frame[]>(apiUrl.value, { params: { start, end } })
      frames.value = res.data

      // precompute ms array for fast binary search
      timestampMs.value = frames.value.map((f) => new Date(f.timestamp).getTime())

      // clear cache
      releaseBlobs()

      // reset index safely
      currentIndex.value = Math.min(currentIndex.value, Math.max(0, frames.value.length - 1))
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Frame fetch error:', err)
    } finally {
      loading.value = false
    }
  }

  // ---- cache helpers ----
  function touch(ts: string) {
    const e = blobCache.get(ts)
    if (e) e.lastUsed = performance.now()
  }

  function evictIfNeeded() {
    if (blobCache.size <= maxCacheItems) return

    // remove least-recently-used entries first
    const entries = [...blobCache.entries()]
    entries.sort((a, b) => a[1].lastUsed - b[1].lastUsed)

    const removeCount = blobCache.size - maxCacheItems
    for (let i = 0; i < removeCount; i++) {
      const [ts, entry] = entries[i]
      URL.revokeObjectURL(entry.objectUrl)
      blobCache.delete(ts)
    }
  }

  async function getObjectUrlFor(index: number, priority: 'high' | 'low') {
    const frame = frames.value[index]
    if (!frame) throw new Error(`Frame missing at index ${index}`)

    const cached = blobCache.get(frame.timestamp)
    if (cached) {
      cached.lastUsed = performance.now()
      return cached.objectUrl
    }

    // Choose controller based on priority
    const controller =
      priority === 'high'
        ? (showAbort ??= new AbortController())
        : (preloadAbort ??= new AbortController())

    const res = await api.get(frame.url, {
      responseType: 'blob',
      signal: controller.signal,
    })

    const objectUrl = URL.createObjectURL(res.data as Blob)
    blobCache.set(frame.timestamp, { objectUrl, index, lastUsed: performance.now() })
    evictIfNeeded()
    return objectUrl
  }

  // ---- preload queue ----
  function stopPreload() {
    preloadAbort?.abort()
    preloadAbort = null
    preloadQueue.length = 0
    preloadQueued.clear()
    preloadRunning = 0
  }

  function enqueuePreload(index: number) {
    if (index < 0 || index >= frames.value.length) return
    if (preloadQueued.has(index)) return

    const f = frames.value[index]
    if (!f) return
    if (blobCache.has(f.timestamp)) return

    preloadQueued.add(index)
    preloadQueue.push(index)
    pumpPreload()
  }

  function pumpPreload() {
    while (preloadRunning < preloadConcurrency && preloadQueue.length) {
      const idx = preloadQueue.shift()!
      preloadRunning++

      void (async () => {
        try {
          // if got cached while queued, skip
          const f = frames.value[idx]
          if (!f) return
          if (blobCache.has(f.timestamp)) return

          await getObjectUrlFor(idx, 'low')
        } catch (err) {
          console.error(`Preload failed @${idx}`, err)
        } finally {
          preloadQueued.delete(idx)
          preloadRunning--
          pumpPreload()
        }
      })()
    }
  }

  function schedulePreloadWindow(centerIndex: number, range = 25) {
    // ensure we don't keep old abort around if nothing running
    // (preloadAbort will be created lazily on first request)
    for (let d = 1; d <= range; d++) {
      enqueuePreload(centerIndex + d)
      enqueuePreload(centerIndex - d)
    }

    // pptional: trim cache based on distance avoiding O(n^2)
    // since we do LRU eviction, this is less necessary.
  }

  // ---- main display ----
  async function showFrame(index: number) {
    if (!map.value || !frames.value.length) return
    const frame = frames.value[index]
    if (!frame) return

    frameLoading.value = true
    const reqId = ++showReqId

    // abort previous showFrame fetch
    showAbort?.abort()
    showAbort = new AbortController()

    // deprioritize preload: abort any in-flight preload downloads
    // so "show this frame now" wins.
    stopPreload()

    try {
      const objectUrl = await getObjectUrlFor(index, 'high')
      if (reqId !== showReqId) return // stale

      if (!overlay.value) {
        overlay.value = markRaw(
          L.imageOverlay(objectUrl, bounds.value, { opacity: opacity.value }).addTo(map.value as L.Map),
        )
      } else {
        overlay.value.setUrl(objectUrl)
      }

      currentIndex.value = index
      touch(frame.timestamp)

      // start preloading around current frame (non-blocking)
      schedulePreloadWindow(index, 25)
    } catch (err) {
      console.error('Failed to show frame:', err)
    } finally {
      if (reqId === showReqId) frameLoading.value = false
    }
  }

  // kept for API compatibility; now schedules via queue
  async function preloadWindow(centerIndex: number, range = 25) {
    // Make it safe to call as before, but do not block.
    // It returns immediately after scheduling work.
    schedulePreloadWindow(centerIndex, range)
  }

  // ---- realtime update ----
  async function fetchLatestFrame(newTimestamp: string) {
    const lastFrame = frames.value[frames.value.length - 1]
    if (!lastFrame) return
    if (new Date(newTimestamp) <= new Date(lastFrame.timestamp)) return

    try {
      // Abort any "show" request? No. This is background-ish.
      // Abort only prior preload (so we don't pile up)
      stopPreload()

      const controller = new AbortController()
      const res = await api.get<Frame[]>(apiUrl.value, {
        params: { start: newTimestamp, end: newTimestamp },
        signal: controller.signal,
      })
      if (!res.data.length) return

      const newFrame = res.data[0]

      // fetch blob (low priority-ish but immediate for latest)
      const blobRes = await api.get(newFrame.url, { responseType: 'blob' })
      const objectUrl = URL.createObjectURL(blobRes.data as Blob)

      // shift old frame out
      const removed = frames.value.shift()

      // remove removed from cache if present
      if (removed?.timestamp) {
        const entry = blobCache.get(removed.timestamp)
        if (entry) {
          URL.revokeObjectURL(entry.objectUrl)
          blobCache.delete(removed.timestamp)
        }
      }

      frames.value.push(newFrame)
      timestampMs.value.push(new Date(newFrame.timestamp).getTime())

      // put in cache
      blobCache.set(newFrame.timestamp, {
        objectUrl,
        index: frames.value.length - 1,
        lastUsed: performance.now(),
      })
      evictIfNeeded()

      // ensure currentIndex stays valid after shift
      if (currentIndex.value > 0) currentIndex.value -= 1

      // if we were at the end, keep showing latest
      // (optional behavior; comment out if not desired)
      // await showFrame(frames.value.length - 1)
    } catch (err) {
      console.error('Fetch latest frame error:', err)
    }
  }

  function changeFrame(delta: number) {
    const newIndex = currentIndex.value + delta
    if (newIndex >= 0 && newIndex < frames.value.length) {
      void showFrame(newIndex)
    }
  }

  // ---- playback (awaited loop, no overlap) ----
  function play() {
    if (isPlaying.value || !frames.value.length) return
    isPlaying.value = true
    const token = ++playToken

    const loop = async () => {
      while (isPlaying.value && token === playToken) {
        const next = (currentIndex.value + 1) % frames.value.length
        await showFrame(next)
        // wait uses current speed each iteration
        await new Promise((r) => setTimeout(r, animationSpeed.value))
      }
    }

    void loop()
  }

  function pause() {
    isPlaying.value = false
    playToken++
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
    for (const entry of blobCache.values()) {
      URL.revokeObjectURL(entry.objectUrl)
    }
    blobCache.clear()
  }

  function findClosestIndex(ts: string) {
    const arr = timestampMs.value
    if (!arr.length) return -1
    const target = new Date(ts).getTime()

    let lo = 0
    let hi = arr.length - 1

    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const midTs = arr[mid]
      if (midTs === target) return mid
      if (midTs < target) lo = mid + 1
      else hi = mid - 1
    }

    if (lo >= arr.length) return arr.length - 1
    if (hi < 0) return 0

    return Math.abs(arr[lo] - target) < Math.abs(arr[hi] - target) ? lo : hi
  }

  async function showNearestTimestamp(ts: string) {
    const idx = findClosestIndex(ts)
    if (idx >= 0) await showFrame(idx)
  }

  function clear() {
    pause()
    stopPreload()

    showAbort?.abort()
    showAbort = null

    // Remove overlay from map
    if (overlay.value && map.value) {
      map.value.removeLayer(overlay.value as L.ImageOverlay)
    }

    // Revoke and clear blobs
    releaseBlobs()

    // Reset everything
    overlay.value = null
    frames.value = []
    timestampMs.value = []
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

    // kept, but now schedules rather than Promise.all
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