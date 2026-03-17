import { api } from '@/api'
import getSecureConfig from '@/cookies'
import { defineStore } from 'pinia'

export interface Site {
  name: string
  x: number
  y: number
  altitude: number | null
}

export interface FullLink {
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

export interface LinkMidpoint {
  id: number
  center_x: number
  center_y: number
}

/**
 * Backward-compatible exported type name.
 * Existing imports using `Link` will still work.
 */
export type Link = FullLink | LinkMidpoint

export interface DryWetFrame {
  utc: string
  overall: number
  cml_rain_true: number[]
  count_true: number
  count_total: number
}

interface ActivitySummary {
  total: number
  active: number
  inactive: number
  groups: number
  activity_type?: 'rain' | 'temp'
  probe_start?: string
  probe_stop?: string
}

const FILTER_KEY = 'linkFilters'

export function isFullLink(link: Link): link is FullLink {
  return (
    'site_A' in link &&
    'site_B' in link &&
    'technology' in link &&
    'influx_mapping' in link &&
    'polarization' in link &&
    'frequency_A' in link &&
    'frequency_B' in link &&
    'length' in link
  )
}

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

      activityByLinkId: {} as Record<number, boolean>,
      activityLoading: false,
      activityError: null as string | null,
      activityRange: { start: null as string | null, end: null as string | null },
      activityMode: null as 'rain' | 'temp' | null,
      activitySummary: null as ActivitySummary | null,
      activityRequestId: 0,
      activityProgress: 0,
    }
  },

  actions: {
    async fetchLinks() {
      this.loading = true
      this.error = null

      try {
        const res = await api.get<Link[]>('/links', getSecureConfig())
        this.links = res.data

        // Only initialize technologies from full links.
        // For anonymous midpoint-only data this becomes [].
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

    async fetchActivity(
      startIso: string,
      endIso: string,
      linkIds: number[],
      activityType: 'rain' | 'temp',
      force = false,
    ) {
      if (
        !force &&
        this.activityRange.start === startIso &&
        this.activityRange.end === endIso &&
        this.activityMode === activityType &&
        Object.keys(this.activityByLinkId).length > 0 &&
        Object.keys(this.activityByLinkId).length === linkIds.length
      ) {
        return
      }

      this.activityLoading = true
      this.activityError = null
      this.activityRange = { start: startIso, end: endIso }
      this.activityMode = activityType
      const requestId = ++this.activityRequestId
      this.activityProgress = 0

      if (linkIds.length === 0) {
        this.activityLoading = false
        this.activityByLinkId = {}
        this.activityProgress = 100
        this.activitySummary = {
          total: 0,
          active: 0,
          inactive: 0,
          groups: 0,
          activity_type: activityType,
        }
        return
      }

      try {
        this.activityProgress = 25

        const res = await api.post<{
          activity: Record<string, boolean>
          summary: ActivitySummary
        }>(
          '/cml-activity',
          { start: startIso, end: endIso, linkIds, activityType },
          getSecureConfig(),
        )

        if (requestId !== this.activityRequestId) {
          return
        }

        this.activityProgress = 85
        const nextActivityByLinkId = Object.fromEntries(
          Object.entries(res.data.activity ?? {}).map(([id, isActive]) => [Number(id), Boolean(isActive)]),
        )
        this.activityByLinkId = nextActivityByLinkId
        this.activitySummary = res.data.summary ?? null
      } catch (err) {
        if (requestId !== this.activityRequestId) {
          return
        }
        this.activityError = err instanceof Error ? err.message : 'Unknown error'
        console.error('Error loading link activity:', err)
        this.activityProgress = 0
      } finally {
        if (requestId === this.activityRequestId) {
          this.activityLoading = false
          if (!this.activityError) {
            this.activityProgress = 100
          }
        }
      }
    },

    clearActivity() {
      this.activityRequestId += 1
      this.activityByLinkId = {}
      this.activityLoading = false
      this.activityError = null
      this.activityRange = { start: null as string | null, end: null as string | null }
      this.activityMode = null
      this.activitySummary = null
      this.activityProgress = 0
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
    groupedLinksByMappingAndTechnology(state): Record<string, Record<string, FullLink[]>> {
      const grouped: Record<string, Record<string, FullLink[]>> = {}

      for (const link of state.links) {
        if (!isFullLink(link)) continue

        const group = link.influx_mapping
        const tech = link.technology

        if (!grouped[group]) grouped[group] = {}
        if (!grouped[group][tech]) grouped[group][tech] = []

        grouped[group][tech].push(link)
      }

      return grouped
    },

    allGroups(state): string[] {
      return [...new Set(state.links.filter(isFullLink).map((link) => link.influx_mapping))]
    },

    allTechnologies(state): string[] {
      return [...new Set(state.links.filter(isFullLink).map((link) => link.technology))]
    },

    filteredLinks(state): Link[] {
      if (state.hideAll) {
        return []
      }

      const minLen = isFinite(state.minDistance) ? state.minDistance : 0
      const maxLen = isFinite(state.maxDistance) ? state.maxDistance : Infinity
      const minFreq = isFinite(state.minFrequency) ? state.minFrequency : 0
      const maxFreq = isFinite(state.maxFrequency) ? state.maxFrequency : Infinity

      return state.links.filter((link) => {
        const isDisabled = state.manuallyDisabledLinkIds.includes(link.id)
        const inManualIds =
          state.filteredIds.length === 0 || state.filteredIds.includes(link.id)

        if (isDisabled || !inManualIds) {
          return false
        }

        // Midpoint-only anonymous link:
        // allow it through so manual show/hide and ID filters still work.
        if (!isFullLink(link)) {
          return true
        }

        const inGroup =
          state.selectedGroups.length === 0 || state.selectedGroups.includes(link.influx_mapping)

        const inTech =
          state.selectedTechnologies.length === 0 ||
          state.selectedTechnologies.includes(link.technology)

        const inPol = state.selectedPolarizations.includes(link.polarization)

        const inLength = link.length >= minLen && link.length <= maxLen

        const inFreq =
          link.frequency_A >= minFreq &&
          link.frequency_A <= maxFreq &&
          link.frequency_B >= minFreq &&
          link.frequency_B <= maxFreq

        return inGroup && inTech && inPol && inLength && inFreq
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

    isLinkInactive: (state) => {
      return (id: number) => state.activityByLinkId[id] === false
    },

    hasLinks: (state) => state.links.length > 0,
  },
})
