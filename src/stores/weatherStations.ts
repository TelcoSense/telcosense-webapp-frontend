import { defineStore } from 'pinia'

import { api } from '@/api'
import getSecureConfig from '@/cookies'

export interface WeatherStation {
  id: number
  wsi: string
  gh_id: string
  full_name: string
  X: number
  Y: number
  elevation: number
}

export const useWeatherStationsStore = defineStore('weatherStations', {
  state: () => ({
    stations: [] as WeatherStation[],
    loading: false,
    error: null as string | null,

    hideAll: false,
  }),
  getters: {
    hasStations: (state) => state.stations.length > 0,

    filteredStations(state): WeatherStation[] {
      if (state.hideAll) {
        return [];
      }
      return state.stations;
    },
  },
  actions: {
    async fetchWeatherStations() {
      this.loading = true
      this.error = null
      try {
        const res = await api.get<WeatherStation[]>('/weather-stations', getSecureConfig())
        this.stations = res.data
      } catch (err) {
        if (err instanceof Error) {
          this.error = err.message
          console.error('Caught error:', err.message)
        } else {
          this.error = 'Unknown error'
          console.error('Unknown error:', err)
        }
      } finally {
        this.loading = false
      }
    },
  },
})