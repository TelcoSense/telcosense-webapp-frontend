import { api } from '@/api'
import getSecureConfig from '@/cookies'
import { defineStore } from 'pinia'

export interface DataPoint {
  time: string
  value: number | null
}

export const useCmlDataStore = defineStore('cmlData', {
  state: () => ({
    cmls: new Map<string, {
      temperatureA: DataPoint[]
      temperatureB: DataPoint[]
      trslA: DataPoint[]
      trslB: DataPoint[]
    }>(),
    selectedCmlId: null as string | null,
    loading: false,
    error: null as string | null,
  }),

  getters: {
    currentTemperature: (state) =>
      state.selectedCmlId
        ? state.cmls.get(state.selectedCmlId)?.temperatureA ?? []
        : [],
    currentTrsl: (state) =>
      state.selectedCmlId
        ? state.cmls.get(state.selectedCmlId)?.trslA ?? []
        : [],
    cmlIds: (state) => Array.from(state.cmls.keys()),
  },

  actions: {
    async fetchCmlData(
      start: string,
      stop: string,
      cmlId: string,
      ipA: string,
      ipB: string,
      tech: string
    ) {
      this.loading = true
      this.error = null
      try {
        const res = await api.post<{
          temp_a: Array<number | null>
          temp_b: Array<number | null>
          trsl_a: Array<number | null>
          trsl_b: Array<number | null>
          time: string[]
        }>(
          '/cmldata',
          { start, stop, ipA, ipB, tech },
          getSecureConfig()
        )
        const { temp_a, temp_b, trsl_a, trsl_b, time } = res.data
        const makeSeries = (values: Array<number | null>): DataPoint[] =>
          values.map((v, i) => ({
            time: time[i],
            value: v,
          }))

        this.cmls.set(cmlId, {
          temperatureA: makeSeries(temp_a),
          temperatureB: makeSeries(temp_b),
          trslA: makeSeries(trsl_a),
          trslB: makeSeries(trsl_b),
        })
        this.selectCml(cmlId)
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Unknown error'
        console.error(err)
      } finally {
        this.loading = false
      }
    },

    selectCml(cmlId: string) {
      if (this.cmls.has(cmlId)) {
        this.selectedCmlId = cmlId
      }
    },
  },
})