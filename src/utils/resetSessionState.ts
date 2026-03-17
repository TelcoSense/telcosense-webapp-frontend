import type { Pinia } from 'pinia'

import { useActiveLayer } from '@/composables/useActiveLayer'
import { useAuthStore } from '@/stores/auth'
import { useCmlDataStore } from '@/stores/cmlData'
import { useConfigStore } from '@/stores/config'
import { useLinksStore } from '@/stores/links'
import { useWeatherDataStore } from '@/stores/weatherData'
import { useWeatherStationsStore } from '@/stores/weatherStations'

export function resetSessionState(pinia?: Pinia) {
  useAuthStore(pinia).reset()
  useWeatherStationsStore(pinia).$reset()
  useWeatherDataStore(pinia).$reset()
  useLinksStore(pinia).$reset()
  useCmlDataStore(pinia).$reset()
  useConfigStore(pinia).$reset()
  useActiveLayer().clearMainLayer()
  useActiveLayer().clearSecondaryLayer()
}
