
import { api } from '@/api'
import getSecureConfig from '@/cookies'
import { defineStore } from 'pinia'

export interface Site {
  name: string
  x: number
  y: number
  altitude: number | null
}

export interface Link {
  id: number
  ip_address_A: string | null
  ip_address_B: string | null
  site_A: Site
  site_B: Site
  technology: string
  polarization: 'V' | 'H' | 'X'
  frequency_A: number
  frequency_B: number
}

export const useLinksStore = defineStore('links', {
  state: () => ({
    links: [] as Link[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchLinks() {
      this.loading = true
      this.error = null
      try {
        const res = await api.get<Link[]>('/links', getSecureConfig())
        this.links = res.data
      } catch (err) {
        if (err instanceof Error) {
          this.error = err.message
          console.error('Error loading links:', err.message)
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