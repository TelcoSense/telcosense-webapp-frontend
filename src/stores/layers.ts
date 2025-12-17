import { useImageLayer } from '@/composables/useImageLayer'
import L from 'leaflet'
import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

export const useLayersStore = defineStore('layers', () => {
  const boundsCZ = L.latLngBounds([48.047, 11.267], [51.458, 19.624])
  const boundsTemp = L.latLngBounds([48.5525, 12.0905], [51.0557, 18.8591])

  // ---------- MAIN MAP ----------
  const maxz = shallowRef(
    useImageLayer('main', 'maxz', {
      apiUrl: '/maxz/list',
      bounds: boundsCZ,
    }),
  )

  const merge1h = shallowRef(
    useImageLayer('main', 'merge1h', {
      apiUrl: '/merge1h/list',
      bounds: boundsCZ,
    }),
  )

  const raincz = shallowRef(
    useImageLayer('main', 'raincz', {
      apiUrl: '/raincz/list',
      bounds: boundsCZ,
    }),
  )

  const userCalc = shallowRef(
    useImageLayer('main', 'user-calc', {
      apiUrl: '/placeholder',
      bounds: L.latLngBounds([0, 0], [0, 0]),
    }),
  )

  // telcotemp (main only)
  const tempcz = shallowRef(
    useImageLayer('main', 'tempcz', {
      apiUrl: '/tempcz/list',
      bounds: boundsTemp,
    }),
  )

  const tempchmi = shallowRef(
    useImageLayer('main', 'tempchmi', {
      apiUrl: '/tempchmi/list',
      bounds: boundsTemp,
    }),
  )

  // ---------- SECONDARY MAP ----------
  const maxzSecondary = shallowRef(
    useImageLayer('secondary', 'maxz', {
      apiUrl: '/maxz/list',
      bounds: boundsCZ,
    }),
  )

  const merge1hSecondary = shallowRef(
    useImageLayer('secondary', 'merge1h', {
      apiUrl: '/merge1h/list',
      bounds: boundsCZ,
    }),
  )

  const rainczSecondary = shallowRef(
    useImageLayer('secondary', 'raincz', {
      apiUrl: '/raincz/list',
      bounds: boundsCZ,
    }),
  )

  const userCalcSecondary = shallowRef(
    useImageLayer('secondary', 'user-calc', {
      apiUrl: '/placeholder',
      bounds: L.latLngBounds([0, 0], [0, 0]),
    }),
  )

  return {
    // main
    maxz,
    merge1h,
    raincz,
    userCalc,
    tempcz,
    tempchmi,

    // secondary
    maxzSecondary,
    merge1hSecondary,
    rainczSecondary,
    userCalcSecondary,
  }
})