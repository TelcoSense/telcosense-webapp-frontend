import { radarApi } from '@/api'
import L from 'leaflet'
import { defineStore } from 'pinia'
import { markRaw } from 'vue'

export interface Frame {
  timestamp: string
  url: string
  objectUrl: string | null
}

export const useMaxzStore = defineStore('maxz', {
  state: () => ({
    frames: [] as Frame[],
    loading: false,
    error: null as string | null,
    map: null as L.Map | null,

    currentIndex: 0,
    overlay: null as L.ImageOverlay | null,
    lastPreloadIndex: -9999,

    isPlaying: false,
    playbackTimer: null as number | null,
    animationSpeed: 150,
    frameLoading: false,

    bounds: L.latLngBounds(
      L.latLng(48.047, 11.267),
      L.latLng(51.458, 19.624)
    ),

    apiUrl: '/api/maxz/list',
  }),

  actions: {
    setMap(map: L.Map) {
      this.map = markRaw(map)
    },

    setVisible(visible: boolean) {
      if (this.overlay) {
        if (visible) {
          this.overlay.addTo(this.map as L.Map)
        } else {
          this.overlay.remove()
        }
      }
    },

    async fetchList(start: string, end: string) {
      this.loading = true
      this.error = null
      try {
        const res = await radarApi.get<Frame[]>(
          this.apiUrl,
          {
            params: { start, end }
          }
        )
        this.frames = res.data.map(frame => ({
          ...frame,
          objectUrl: null,
        }))
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Unknown error'
        console.error('Fetch error:', err)
      } finally {
        this.loading = false
      }
    },

    async preloadWindow(centerIndex: number, range = 50) {
      const start = Math.max(0, centerIndex - range)
      const end = Math.min(this.frames.length, centerIndex + range)
      const toKeep = new Set<number>()
      for (let i = start; i < end; i++) toKeep.add(i)
      await Promise.all(
        this.frames.map(async (frame, i) => {
          if (toKeep.has(i)) {
            if (!frame.objectUrl) {
              try {
                const res = await radarApi.get(frame.url, {
                  responseType: 'blob',
                })
                const blob = res.data as Blob
                frame.objectUrl = URL.createObjectURL(blob)
              } catch (err) {
                if (err instanceof Error) {
                  this.error = err.message
                  console.error(`Failed to load radar frame ${frame.timestamp}`)
                } else {
                  this.error = 'Unknown error'
                  console.error('Unknown error:', err)
                }
              }
            }
          }
        })
      )
      for (let i = 0; i < this.frames.length; i++) {
        const frame = this.frames[i]
        if (!toKeep.has(i) && frame.objectUrl) {
          URL.revokeObjectURL(frame.objectUrl)
          frame.objectUrl = null
        }
      }
    },

    async fetchLatestFrame(timestamp: string) {
      if (!this.frames.length) return
      const lastFrame = this.frames[this.frames.length - 1]
      const lastTime = new Date(lastFrame.timestamp).getTime()
      const newTime = new Date(timestamp).getTime()
      if (newTime <= lastTime) return
      try {
        const res = await radarApi.get<Frame[]>(this.apiUrl, {
          params: { start: timestamp, end: timestamp },
        })
        if (!res.data.length) return
        const raw = res.data[0]
        const newFrame: Frame = {
          timestamp: raw.timestamp,
          url: raw.url,
          objectUrl: null,
        }
        const blobRes = await radarApi.get(newFrame.url, {
          responseType: 'blob',
        })
        const blob = blobRes.data as Blob
        newFrame.objectUrl = URL.createObjectURL(blob)
        const removed = this.frames.shift()
        if (removed?.objectUrl) URL.revokeObjectURL(removed.objectUrl)
        this.frames.push(newFrame)
      } catch (err) {
        console.error('Failed to fetch latest frame:', err)
      }
    },

    async showFrame(index: number) {
      if (!this.frames.length) return
      const frame = this.frames[index]
      if (!frame) return
      this.frameLoading = true
      try {
        if (!frame.objectUrl) {
          const res = await radarApi.get(frame.url, {
            responseType: 'blob',
          })
          const blob = res.data as Blob
          frame.objectUrl = URL.createObjectURL(blob)
        }
        this.currentIndex = index
        if (!this.overlay) {
          this.overlay = markRaw(
            L.imageOverlay(frame.objectUrl, this.bounds).addTo(this.map as L.Map)
          )
        } else {
          this.overlay.setUrl(frame.objectUrl)
        }
        if (Math.abs(index - this.lastPreloadIndex) >= 5) {
          this.preloadWindow(index, 25)
          this.lastPreloadIndex = index
        }
      } catch (err) {
        console.error(`Failed to load frame at index ${index}:`, err)
      } finally {
        this.frameLoading = false
      }
    },

    changeFrame(delta: number) {
      const newIndex = this.currentIndex + delta
      if (newIndex >= 0 && newIndex < this.frames.length) {
        this.showFrame(newIndex)
      }
    },

    play() {
      if (this.isPlaying || this.frames.length === 0) return
      this.isPlaying = true
      this.playbackTimer = window.setInterval(() => {
        const next = (this.currentIndex + 1) % this.frames.length
        this.showFrame(next)
      }, this.animationSpeed)
    },

    pause() {
      this.isPlaying = false
      if (this.playbackTimer !== null) {
        clearInterval(this.playbackTimer)
        this.playbackTimer = null
      }
    },

    toggle() {
      if (this.isPlaying) this.pause()
      else this.play()
    },

    releaseBlobs() {
      for (const frame of this.frames) {
        if (frame.objectUrl) {
          URL.revokeObjectURL(frame.objectUrl)
          frame.objectUrl = null
        }
      }
    },

  }
})