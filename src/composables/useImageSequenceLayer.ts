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
  lastUsed: number
}

export function useImageSequenceLayer(initialConfig: { apiUrl: string; bounds: L.LatLngBounds }) {
  const apiUrl = ref(initialConfig.apiUrl)
  const bounds = ref(initialConfig.bounds)

  const frames = shallowRef<Frame[]>([])
  const timestampMs = shallowRef<number[]>([])

  // fast membership check (prevents duplicates when windows overlap)
  const knownTimestamps = new Set<string>()

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
  const opacity = ref(0.4)

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

  function isCanceled(err: unknown): boolean {
    // AbortController cancellation (some browsers / fetch-style)
    if (err instanceof DOMException && err.name === 'AbortError') return true

    // axios cancellation (v1): usually { code: 'ERR_CANCELED', name: 'CanceledError' }
    if (typeof err !== 'object' || err === null) return false

    if (!('name' in err) && !('code' in err)) return false

    const name =
      'name' in err && typeof (err as { name: unknown }).name === 'string'
        ? (err as { name: string }).name
        : null

    const code =
      'code' in err && typeof (err as { code: unknown }).code === 'string'
        ? (err as { code: string }).code
        : null

    return code === 'ERR_CANCELED' || name === 'CanceledError'
  }

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

  function getOverlay() {
    return overlay.value
  }

  function rebuildKnownSet() {
    knownTimestamps.clear()
    for (const f of frames.value) knownTimestamps.add(f.timestamp)
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

      // rebuild membership set
      rebuildKnownSet()

      // clear cache
      releaseBlobs()

      // reset index safely
      currentIndex.value = Math.min(currentIndex.value, Math.max(0, frames.value.length - 1))
    } catch (err) {
      if (!isCanceled(err)) {
        error.value = err instanceof Error ? err.message : 'Unknown error'
        console.error('Frame fetch error:', err)
      }
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
    blobCache.set(frame.timestamp, { objectUrl, lastUsed: performance.now() })
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
          const f = frames.value[idx]
          if (!f) return
          if (blobCache.has(f.timestamp)) return

          await getObjectUrlFor(idx, 'low')
        } catch (err) {
          if (!isCanceled(err)) {
            console.error(`Preload failed @${idx}`, err)
          }
        } finally {
          preloadQueued.delete(idx)
          preloadRunning--
          pumpPreload()
        }
      })()
    }
  }

  function schedulePreloadWindow(centerIndex: number, range = 25) {
    for (let d = 1; d <= range; d++) {
      enqueuePreload(centerIndex + d)
      enqueuePreload(centerIndex - d)
    }
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
      if (!isCanceled(err)) {
        console.error('Failed to show frame:', err)
      }
    } finally {
      if (reqId === showReqId) frameLoading.value = false
    }
  }

  // kept for API compatibility; now schedules via queue
  async function preloadWindow(centerIndex: number, range = 25) {
    schedulePreloadWindow(centerIndex, range)
  }

  // ---- rolling window sync (your 1-week window, timer step 5 min) ----
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000

  function dropOlderThan(cutoffMs: number) {
    // frames are assumed chronological
    while (frames.value.length) {
      const t0 = new Date(frames.value[0]!.timestamp).getTime()
      if (t0 >= cutoffMs) break

      const removed = frames.value.shift()!
      timestampMs.value.shift()
      knownTimestamps.delete(removed.timestamp)

      const entry = blobCache.get(removed.timestamp)
      if (entry) {
        URL.revokeObjectURL(entry.objectUrl)
        blobCache.delete(removed.timestamp)
      }

      if (currentIndex.value > 0) currentIndex.value -= 1
    }
  }

  async function syncRollingWindow(
    tickStart: string,
    tickEnd: string,
    opts?: { windowMs?: number; followLatest?: boolean },
  ) {
    if (!tickStart || !tickEnd) return

    if (knownTimestamps.size !== frames.value.length) rebuildKnownSet()

    try {
      stopPreload()
      const res = await api.get<Frame[]>(apiUrl.value, { params: { start: tickStart, end: tickEnd } })
      const got = res.data ?? []
      const wasAtEnd = currentIndex.value >= frames.value.length - 1
      const fresh = got
        .filter((f) => !knownTimestamps.has(f.timestamp))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      if (fresh.length) {
        for (const f of fresh) {
          frames.value.push(f)
          timestampMs.value.push(new Date(f.timestamp).getTime())
          knownTimestamps.add(f.timestamp)
        }
      }
      const endMs = new Date(tickEnd).getTime()
      const cutoffMs = endMs - (opts?.windowMs ?? WEEK_MS)
      dropOlderThan(cutoffMs)
      const followLatest = opts?.followLatest ?? true
      if (followLatest && wasAtEnd && frames.value.length) {
        void showFrame(frames.value.length - 1)
      }
    } catch (err) {
      if (!isCanceled(err)) {
        console.error('syncRollingWindow failed:', err)
      }
    }
  }
  async function syncSinceLast(tickEnd: string, opts?: { windowMs?: number; followLatest?: boolean }) {
    const last = frames.value[frames.value.length - 1]
    if (!last) return
    const startIso = new Date(new Date(last.timestamp).getTime() + 1).toISOString()
    await syncRollingWindow(startIso, tickEnd, opts)
  }

  async function fetchLatestFrame(newTimestamp: string) {
    await syncSinceLast(newTimestamp, { windowMs: WEEK_MS, followLatest: false })
  }

  function changeFrame(delta: number) {
    const newIndex = currentIndex.value + delta
    if (newIndex >= 0 && newIndex < frames.value.length) {
      void showFrame(newIndex)
    }
  }

  function play() {
    if (isPlaying.value || !frames.value.length) return
    isPlaying.value = true
    const token = ++playToken

    const loop = async () => {
      while (isPlaying.value && token === playToken) {
        const next = (currentIndex.value + 1) % frames.value.length
        await showFrame(next)
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

    if (overlay.value && map.value) {
      map.value.removeLayer(overlay.value as L.ImageOverlay)
    }

    releaseBlobs()

    overlay.value = null
    frames.value = []
    timestampMs.value = []
    knownTimestamps.clear()
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
    getOverlay,

    preloadWindow,
    fetchLatestFrame,

    syncRollingWindow,
    syncSinceLast,

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
