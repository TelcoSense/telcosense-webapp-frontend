import { useImageSequenceLayer } from '@/composables/useImageSequenceLayer';
import L from 'leaflet';

const layerMap = new Map<string, ReturnType<typeof useImageSequenceLayer>>()

export function useImageLayer(
  id: string,
  config?: { apiUrl: string; bounds: L.LatLngBounds }
) {
  if (!layerMap.has(id)) {
    if (!config) {
      throw new Error(`Layer with id '${id}' not initialized and no config provided`)
    }
    const instance = useImageSequenceLayer(config)
    layerMap.set(id, instance)
  }

  return layerMap.get(id)!
}