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
      rainIntensity: DataPoint[]
    }>(),
    cmlMeta: new Map<string, { ipA: string; ipB: string; tech: string }>(),
    selectedCmlId: null as string | null,
    loading: false,
    error: null as string | null,
  }),

  getters: {
    cmlIds: (state) => Array.from(state.cmls.keys()),
  },

  actions: {
    async fetchCmlData(
      start: string | null,
      stop: string | null,
      cmlId: string,
      ipA: string,
      ipB: string,
      tech: string
    ) {
      if (!start || !stop) return
      this.loading = true
      this.error = null
      try {
        const res = await api.post<{
          temp_a: Array<number | null>
          temp_b: Array<number | null>
          trsl_a: Array<number | null>
          trsl_b: Array<number | null>
          rain_intensity: Array<number | null>
          time: string[]
          rain_intensity_time: string[]
        }>(
          '/cmldata',
          { start, stop, ipA, ipB, tech, cmlId },
          getSecureConfig()
        )

        const {
          temp_a,
          temp_b,
          trsl_a,
          trsl_b,
          rain_intensity,
          time,
          rain_intensity_time,
        } = res.data

        const makeSeries = (values: Array<number | null>, timestamps: string[]): DataPoint[] =>
          values.map((v, i) => ({
            time: timestamps[i] ?? '',
            value: v,
          }))

        this.cmls.set(cmlId, {
          temperatureA: makeSeries(temp_a, time),
          temperatureB: makeSeries(temp_b, time),
          trslA: makeSeries(trsl_a, time),
          trslB: makeSeries(trsl_b, time),
          rainIntensity: makeSeries(rain_intensity, rain_intensity_time),
        })

        this.cmlMeta.set(cmlId, { ipA, ipB, tech })
        this.selectCml(cmlId)
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
        for (const cmlId of this.cmlIds) {
          const meta = this.cmlMeta.get(cmlId)
          if (meta) {
            const { ipA, ipB, tech } = meta
            await this.fetchCmlData(start, stop, cmlId, ipA, ipB, tech)
          } else {
            console.warn(`Missing metadata for CML ID: ${cmlId}`)
          }
        }
      } catch (err) {
        console.error('CML refresh failed:', err)
        this.error = err instanceof Error ? err.message : 'Unknown error'
      } finally {
        this.loading = false
      }
    },

    selectCml(cmlId: string) {
      if (this.cmls.has(cmlId)) {
        this.selectedCmlId = cmlId
      }
    },

    removeCml(cmlId: string) {
      this.cmls.delete(cmlId)
      this.cmlMeta.delete(cmlId)
      if (this.selectedCmlId === cmlId) {
        this.selectedCmlId = this.cmlIds[0] ?? null
      }
    },

    clear() {
      this.cmls.clear()
      this.cmlMeta.clear()
      this.selectedCmlId = null
    },
  },
})