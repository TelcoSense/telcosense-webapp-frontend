import { useImageLayer } from '@/composables/useImageLayer'
import L from 'leaflet'
import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

export const useLayersStore = defineStore('layers', () => {
  const boundsCZ = L.latLngBounds([48.047, 11.267], [51.458, 19.624])
  const boundsTemp = L.latLngBounds([48.5525, 12.0905], [51.0557, 18.8591])

  // rain primary 
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

  // rain secondary
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

  // const userCalcSecondary = shallowRef(
  //   useImageLayer('secondary', 'user-calc', {
  //     apiUrl: '/placeholder',
  //     bounds: L.latLngBounds([0, 0], [0, 0]),
  //   }),
  // )

  // temp primary
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

  // temp primary
  const tempczSecondary = shallowRef(
    useImageLayer('main', 'tempcz', {
      apiUrl: '/tempcz/list',
      bounds: boundsTemp,
    }),
  )

  const tempchmiSecondary = shallowRef(
    useImageLayer('main', 'tempchmi', {
      apiUrl: '/tempchmi/list',
      bounds: boundsTemp,
    }),
  )

  function clearRainLayers(secondary: boolean = false) {
    maxz.value.clear()
    merge1h.value.clear()
    raincz.value.clear()
    userCalc.value.clear()
    if (secondary) {
      maxzSecondary.value.clear()
      merge1hSecondary.value.clear()
      rainczSecondary.value.clear()
    }
  }

  function fetchListRain(start: string | null, end: string | null, secondary: boolean = false) {
    maxz.value.fetchList(start, end)
    merge1h.value.fetchList(start, end)
    raincz.value.fetchList(start, end)
    if (secondary) {
      maxzSecondary.value.fetchList(start, end)
      merge1hSecondary.value.fetchList(start, end)
      rainczSecondary.value.fetchList(start, end)
    }
  }

  function clearTempLayers(secondary: boolean = false) {
    tempchmi.value.clear()
    tempcz.value.clear()
    if (secondary) {
      tempchmiSecondary.value.clear()
      tempczSecondary.value.clear()
    }
  }

  return {
    // rain primary
    maxz,
    merge1h,
    raincz,
    userCalc,
    // secondary
    maxzSecondary,
    merge1hSecondary,
    rainczSecondary,
    // userCalcSecondary,
    // temp primary
    tempcz,
    tempchmi,
    // temp secondary
    tempczSecondary,
    tempchmiSecondary,

    // funcs
    clearRainLayers,
    clearTempLayers,
    fetchListRain
  }
})