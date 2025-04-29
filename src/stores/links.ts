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
  influx_mapping: string
  polarization: 'V' | 'H' | 'X'
  frequency_A: number
  frequency_B: number
  length: number
}

export const useLinksStore = defineStore('links', {
  state: () => ({
    links: [] as Link[],
    loading: true,
    error: null as string | null,
    hideAll: false,

    selectedTechnologies: [] as string[],
    selectedPolarizations: ['V', 'H', 'X'] as ('V' | 'H' | 'X')[],
    minDistance: 0,
    maxDistance: 100000,
    minFrequency: 0,
    maxFrequency: 100000,
  }),

  actions: {
    async fetchLinks() {
      this.loading = true
      this.error = null
      try {
        const res = await api.get<Link[]>('/links', getSecureConfig())
        this.links = res.data
        this.selectedTechnologies = this.allTechnologies
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
    resetLengthFilter() {
      this.minDistance = 0
      this.maxDistance = 100000
    },
    resetFrequencyFilter() {
      this.minFrequency = 0
      this.maxFrequency = 100000
    },
  },

  getters: {
    groupedLinksByMappingAndTechnology(state): Record<string, Record<string, Link[]>> {
      const grouped: Record<string, Record<string, Link[]>> = {}

      for (const link of state.links) {
        const group = link.influx_mapping
        const tech = link.technology

        if (!grouped[group]) grouped[group] = {}
        if (!grouped[group][tech]) grouped[group][tech] = []

        grouped[group][tech].push(link)
      }
      return grouped
    },
    allGroups(state): string[] {
      return [...new Set(state.links.map((link) => link.influx_mapping))]
    },
    allTechnologies(state): string[] {
      return [...new Set(state.links.map((link) => link.technology))]
    },
    selectedGroups(state): string[] {
      const groupsSet = new Set(state.links.map(link => link.influx_mapping))
      const groups: string[] = []

      for (const group of groupsSet) {
        const techs = [
          ...new Set(
            state.links
              .filter(link => link.influx_mapping === group)
              .map(link => link.technology)
          ),
        ]

        const allSelected = techs.every(tech => state.selectedTechnologies.includes(tech))

        if (allSelected) {
          groups.push(group)
        }
      }

      return groups
    },

    filteredLinks(state): Link[] {
      if (state.hideAll) {
        return []
      }

      const minLen = isFinite(state.minDistance) ? state.minDistance : 0
      const maxLen = isFinite(state.maxDistance) ? state.maxDistance : Infinity
      const minFreq = isFinite(state.minFrequency) ? state.minFrequency : 0
      const maxFreq = isFinite(state.maxFrequency) ? state.maxFrequency : Infinity

      return state.links.filter(link => {
        const inTech = state.selectedTechnologies.includes(link.technology)
        const inPol = state.selectedPolarizations.includes(link.polarization)

        const inLength = link.length >= minLen && link.length <= maxLen
        const inFreq =
          link.frequency_A >= minFreq &&
          link.frequency_A <= maxFreq &&
          link.frequency_B >= minFreq &&
          link.frequency_B <= maxFreq

        return inTech && inPol && inLength && inFreq
      })
    },

    hasLinks: (state) => state.links.length > 0,
  },
})
