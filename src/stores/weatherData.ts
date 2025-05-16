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
    temperature: [] as WeatherDataPoint[],
    precipitation: [] as WeatherDataPoint[],
    loading: false,
    error: null as string | null,
  }),

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
        this.temperature = res.data.T
        this.precipitation = res.data.SRA10M
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Unknown error'
        console.error(err)
      } finally {
        this.loading = false
      }
    },
  },
})
