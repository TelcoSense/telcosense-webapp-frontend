import { radarApi } from '@/api'
import getSecureConfig from '@/cookies'
import L from 'leaflet'
import { defineStore } from 'pinia'
import { markRaw } from 'vue'

export interface RadarFrame {
  timestamp: string
  url: string
  objectUrl: string | null
}

export const useRadarStore = defineStore('radar', {
  state: () => ({
    frames: [] as RadarFrame[],
    loading: false,
    error: null as string | null,
    map: null as L.Map | null,

    currentIndex: 0,
    radarOverlay: null as L.ImageOverlay | null,
    lastPreloadIndex: -9999,

    isPlaying: false,
    playbackTimer: null as number | null,
    animationSpeed: 100,
    frameLoading: false,
  }),

  actions: {
    setMap(map: L.Map) {
      this.map = markRaw(map)
    },

    setVisible(visible: boolean) {
      if (this.radarOverlay) {
        if (visible) {
          this.radarOverlay.addTo(this.map as L.Map)
        } else {
          this.radarOverlay.remove()
        }
      }
    },

    async fetchRadarList(start: string, end: string) {
      this.loading = true
      this.error = null
      try {
        const res = await radarApi.get<RadarFrame[]>(
          `/api/maxz/list`,
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
        console.error('Radar fetch error:', err)
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
                  ...getSecureConfig(),
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
        const res = await radarApi.get<RadarFrame[]>('/api/maxz/list', {
          params: { start: timestamp, end: timestamp },
        })
        if (!res.data.length) return
        const raw = res.data[0]
        const newFrame: RadarFrame = {
          timestamp: raw.timestamp,
          url: raw.url,
          objectUrl: null,
        }
        const blobRes = await radarApi.get(newFrame.url, {
          ...getSecureConfig(),
          responseType: 'blob',
        })
        const blob = blobRes.data as Blob
        newFrame.objectUrl = URL.createObjectURL(blob)
        const removed = this.frames.shift()
        if (removed?.objectUrl) URL.revokeObjectURL(removed.objectUrl)
        this.frames.push(newFrame)
      } catch (err) {
        console.error('Failed to fetch latest radar frame:', err)
      }
    },

    async showRadarFrame(index: number) {
      if (!this.frames.length) return
      const frame = this.frames[index]
      if (!frame) return

      this.frameLoading = true

      try {
        if (!frame.objectUrl) {
          const res = await radarApi.get(frame.url, {
            ...getSecureConfig(),
            responseType: 'blob',
          })
          const blob = res.data as Blob
          frame.objectUrl = URL.createObjectURL(blob)
        }

        const radarBounds = L.latLngBounds(
          L.latLng(48.047, 11.267),
          L.latLng(51.458, 19.624)
        )

        this.currentIndex = index

        if (!this.radarOverlay) {
          this.radarOverlay = markRaw(
            L.imageOverlay(frame.objectUrl, radarBounds, { className: 'no-smoothing' }).addTo(this.map as L.Map)
          )
        } else {
          this.radarOverlay.setUrl(frame.objectUrl)
        }
        if (Math.abs(index - this.lastPreloadIndex) >= 5) {
          this.preloadWindow(index, 25)
          this.lastPreloadIndex = index
        }
      } catch (err) {
        console.error(`Failed to load radar frame at index ${index}:`, err)
      } finally {
        this.frameLoading = false
      }
    },

    changeRadarFrame(delta: number) {
      const newIndex = this.currentIndex + delta
      if (newIndex >= 0 && newIndex < this.frames.length) {
        this.showRadarFrame(newIndex)
      }
    },

    playRadar() {
      if (this.isPlaying || this.frames.length === 0) return
      this.isPlaying = true

      this.playbackTimer = window.setInterval(() => {
        const next = (this.currentIndex + 1) % this.frames.length
        this.showRadarFrame(next)
      }, this.animationSpeed)
    },

    pauseRadar() {
      this.isPlaying = false
      if (this.playbackTimer !== null) {
        clearInterval(this.playbackTimer)
        this.playbackTimer = null
      }
    },

    toggleRadar() {
      if (this.isPlaying) this.pauseRadar()
      else this.playRadar()
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