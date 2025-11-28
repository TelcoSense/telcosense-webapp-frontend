import { useImageLayer } from '@/composables/useImageLayer'
import L from 'leaflet'
import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

export const useLayersStore = defineStore('layers', () => {
  const maxz = shallowRef(
    useImageLayer('maxz', {
      apiUrl: '/maxz/list',
      bounds: L.latLngBounds(L.latLng(48.047, 11.267), L.latLng(51.458, 19.624)),
    }),
  )

  const merge1h = shallowRef(
    useImageLayer('merge1h', {
      apiUrl: '/merge1h/list',
      bounds: L.latLngBounds([48.047, 11.267], [51.458, 19.624]),
    }),
  )

  const raincz = shallowRef(
    useImageLayer('raincz', {
      apiUrl: '/raincz/list',
      bounds: L.latLngBounds([48.5525, 12.0905], [51.0557, 18.8591]),
    }),
  )

  // const raincz = shallowRef(
  //   useImageLayer('raincz', {
  //     apiUrl: '/raincz/list',
  //     bounds: L.latLngBounds([48.55547303756637, 12.094991576420597], [51.05353169070471, 18.8503225129994]),
  //   }),
  // )

  const userCalc = shallowRef(
    useImageLayer('user-calc', {
      apiUrl: '/placeholder',
      bounds: L.latLngBounds([0, 0], [0, 0]),
    }))

  // telcotemp starts here:
  const tempcz = shallowRef(
    useImageLayer('tempcz', {
      apiUrl: '/tempcz/list',
      bounds: L.latLngBounds([48.5525, 12.0905], [51.0557, 18.8591]),
    }),
  )

  const tempchmi = shallowRef(
    useImageLayer('tempchmi', {
      apiUrl: '/tempchmi/list',
      bounds: L.latLngBounds([48.5525, 12.0905], [51.0557, 18.8591]),
    }),
  )

  return { maxz, merge1h, raincz, userCalc, tempcz, tempchmi }
})