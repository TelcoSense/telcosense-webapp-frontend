import { useImageSequenceLayer } from '@/composables/useImageSequenceLayer';
import L from 'leaflet';

const layerMap = new Map<string, ReturnType<typeof useImageSequenceLayer>>()

export function useImageLayer(
  mapTarget: 'main' | 'secondary',
  id: string,

  config?: { apiUrl: string; bounds: L.LatLngBounds; secure?: boolean }
) {
  const key = `${mapTarget}:${id}`

  if (!layerMap.has(key)) {
    if (!config) {
      throw new Error(`Layer '${key}' not initialized and no config provided`)
    }
    layerMap.set(key, useImageSequenceLayer(config))
  }

  return layerMap.get(key)!
}
