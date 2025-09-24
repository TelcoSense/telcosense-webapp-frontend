import type L from 'leaflet'
import { ref } from 'vue'

const mapRef = ref<L.Map | null>(null)

export function useMap() {
  return {
    map: mapRef,
    setMap: (mapInstance: L.Map) => {
      mapRef.value = mapInstance
    },
    clearMap: () => {
      mapRef.value = null
    },
  }
}