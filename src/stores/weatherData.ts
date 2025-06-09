import { api } from '@/api'
import getSecureConfig from '@/cookies'
import { defineStore } from 'pinia'

export interface WeatherDataPoint {
  time: string
  measurement: string
  field: string
  value: number
}

export const useWeatherDataStore = defineStore('weatherData', {
  state: () => ({
    stations: new Map<string, { temperature: WeatherDataPoint[]; precipitation: WeatherDataPoint[] }>(),
    selectedStationId: null as string | null,
    loading: false,
    error: null as string | null,
  }),

  getters: {
    currentTemperature: (state) =>
      state.selectedStationId ? state.stations.get(state.selectedStationId)?.temperature ?? [] : [],
    currentPrecipitation: (state) =>
      state.selectedStationId ? state.stations.get(state.selectedStationId)?.precipitation ?? [] : [],
    stationIds: (state) => Array.from(state.stations.keys()),
  },

  actions: {
    async fetchStationData(start: string, stop: string, ghId: string) {
      this.loading = true
      this.error = null
      try {
        const res = await api.post<{ T: WeatherDataPoint[]; SRA10M: WeatherDataPoint[] }>(
          '/wsdata',
          { start, stop, ghId },
          getSecureConfig()
        )
        this.stations.set(ghId, {
          temperature: res.data.T,
          precipitation: res.data.SRA10M,
        })
        this.selectedStationId ||= ghId
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Unknown error'
        console.error(err)
      } finally {
        this.loading = false
      }
    },

    async refresh(start: string, stop: string) {
      this.loading = true
      this.error = null
      try {
        for (const ghId of this.stationIds) {
          await this.fetchStationData(start, stop, ghId)
        }
      } catch (err) {
        console.error('Refresh failed:', err)
        this.error = err instanceof Error ? err.message : 'Unknown error'
      } finally {
        this.loading = false
      }
    },

    selectStation(ghId: string) {
      if (this.stations.has(ghId)) {
        this.selectedStationId = ghId
      }
    },

    removeStation(ghId: string) {
      this.stations.delete(ghId)
      if (this.selectedStationId === ghId) {
        this.selectedStationId = this.stationIds[0] ?? null
      }
    },

    clear() {
      this.stations.clear()
      this.selectedStationId = null
    },


  },
})
