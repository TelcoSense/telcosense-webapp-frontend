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
  ip_address_A: string
  ip_address_B: string
  site_A: Site
  site_B: Site
  technology: string
  influx_mapping: string
  polarization: 'V' | 'H' | 'X'
  frequency_A: number
  frequency_B: number
  length: number
  center_x: number
  center_y: number
}

export interface DryWetFrame {
  utc: string
  overall: number
  cml_rain_true: number[]
  count_true: number
  count_total: number
}

const FILTER_KEY = 'linkFilters'

function loadSavedFilters() {
  try {
    const saved = localStorage.getItem(FILTER_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

function saveFilters(state: ReturnType<typeof useLinksStore>) {
  const filters = {
    hideAll: state.hideAll,
    selectedGroups: state.selectedGroups,
    selectedTechnologies: state.selectedTechnologies,
    selectedPolarizations: state.selectedPolarizations,
    manuallyDisabledLinkIds: state.manuallyDisabledLinkIds,
    minDistance: state.minDistance,
    maxDistance: state.maxDistance,
    minFrequency: state.minFrequency,
    maxFrequency: state.maxFrequency,
    manualIdFilterInput: state.manualIdFilterInput,
    filteredIds: state.filteredIds,
  }
  localStorage.setItem(FILTER_KEY, JSON.stringify(filters))
}

function isoToUtcKey10min(iso: string): string {
  const d = new Date(iso)

  // snap DOWN to 10-minute grid
  d.setUTCMinutes(Math.floor(d.getUTCMinutes() / 10) * 10, 0, 0)

  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')

  return `${yyyy}-${mm}-${dd}_${hh}${min}`
}

export const useLinksStore = defineStore('links', {
  state: () => {
    const saved = loadSavedFilters()
    return {
      links: [] as Link[],
      loading: true,
      error: null as string | null,
      hideAll: saved.hideAll ?? false,

      selectedGroups: saved.selectedGroups ?? [],
      selectedTechnologies: saved.selectedTechnologies ?? [],
      selectedPolarizations: saved.selectedPolarizations ?? ['V', 'H', 'X'],
      manuallyDisabledLinkIds: saved.manuallyDisabledLinkIds ?? [],

      minDistance: saved.minDistance ?? 0,
      maxDistance: saved.maxDistance ?? 100000,
      minFrequency: saved.minFrequency ?? 0,
      maxFrequency: saved.maxFrequency ?? 100000,

      showLinkTable: false,
      linkFilterVisible: true,

      manualIdFilterInput: saved.manualIdFilterInput ?? '',
      filteredIds: saved.filteredIds ?? [],
      drywet: [] as DryWetFrame[],
      drywetLoading: false,
      drywetError: null as string | null,
      drywetRange: { start: null as string | null, end: null as string | null },
    }
  },

  actions: {
    async fetchLinks() {
      this.loading = true
      this.error = null
      try {
        const res = await api.get<Link[]>('/links', getSecureConfig())
        this.links = res.data
        if (this.selectedTechnologies.length === 0) {
          this.selectedTechnologies = this.allTechnologies
        }
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Unknown error'
        console.error('Error loading links:', err)
      } finally {
        this.loading = false
        saveFilters(this)
      }
    },

    async fetchDrywet(startIso: string, endIso: string) {
      this.drywetLoading = true
      this.drywetError = null
      this.drywetRange = { start: startIso, end: endIso }
      try {
        const res = await api.get<DryWetFrame[]>('/drywet', {
          ...getSecureConfig(),
          params: { start: startIso, end: endIso },
        })
        this.drywet = res.data ?? []
      } catch (err) {
        this.drywetError = err instanceof Error ? err.message : 'Unknown error'
        console.error('Error loading drywet:', err)
        this.drywet = []
      } finally {
        this.drywetLoading = false
      }
    },

    applyManualIdFilter(input: string) {
      this.manualIdFilterInput = input
      this.filteredIds = input
        .split(',')
        .map((s) => s.trim())
        .filter((s) => /^\d+$/.test(s))
        .map((s) => parseInt(s, 10))

      saveFilters(this)
    },

    resetManualIdFilter() {
      this.manualIdFilterInput = ''
      this.filteredIds = []
      saveFilters(this)
    },

    toggleManualLinkDisable(id: number) {
      const index = this.manuallyDisabledLinkIds.indexOf(id)
      if (index === -1) {
        this.manuallyDisabledLinkIds.push(id)
      } else {
        this.manuallyDisabledLinkIds.splice(index, 1)
      }
      saveFilters(this)
    },

    resetLengthFilter() {
      this.minDistance = 0
      this.maxDistance = 100000
      saveFilters(this)
    },

    resetFrequencyFilter() {
      this.minFrequency = 0
      this.maxFrequency = 100000
      saveFilters(this)
    },

    resetAllFilters() {
      this.hideAll = false
      this.selectedGroups = []
      this.selectedTechnologies = this.allTechnologies
      this.selectedPolarizations = ['V', 'H', 'X']
      this.manuallyDisabledLinkIds = []
      this.minDistance = 0
      this.maxDistance = 100000
      this.minFrequency = 0
      this.maxFrequency = 100000
      this.manualIdFilterInput = ''
      this.filteredIds = []
      saveFilters(this)
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

        const isDisabled = state.manuallyDisabledLinkIds.includes(link.id)
        const inManualIds =
          state.filteredIds.length === 0 || state.filteredIds.includes(link.id)

        return inTech && inPol && inLength && inFreq && !isDisabled && inManualIds
      })
    },

    drywetFrameByIso: (state) => {
      const map: Record<string, DryWetFrame> = {}
      for (const f of state.drywet) map[f.utc] = f

      return (iso: string) => {
        const key = isoToUtcKey10min(iso)
        return map[key] ?? null
      }
    },

    hasLinks: (state) => state.links.length > 0,
  },
})