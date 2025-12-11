import type L from 'leaflet'
import { ref } from 'vue'

const primaryMap = ref<L.Map | null>(null)
const secondaryMap = ref<L.Map | null>(null)

export function useMap() {
  return {
    // primary map (left / single map view)
    primaryMap,
    setPrimaryMap: (mapInstance: L.Map) => {
      primaryMap.value = mapInstance
    },

    // secondary map (right pane)
    secondaryMap,
    setSecondaryMap: (mapInstance: L.Map) => {
      secondaryMap.value = mapInstance
    },

    // optional: clear both
    clearMaps: () => {
      primaryMap.value = null
      secondaryMap.value = null
    },

    // optional: alias — backward compatibility
    map: primaryMap,
    setMap: (mapInstance: L.Map) => {
      primaryMap.value = mapInstance
    },
  }
}