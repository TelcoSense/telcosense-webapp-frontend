import type { ComputedRef } from 'vue';
import { computed, ref } from 'vue';

export interface ControllableLayer {
  name: string
  frames: ComputedRef<{ timestamp: string; objectUrl: string | null }[]>
  currentIndex: ComputedRef<number>
  isPlaying: ComputedRef<boolean>
  frameLoading: ComputedRef<boolean>

  showFrame(index: number): void
  play(): void
  pause(): void
  toggle(): void
  changeFrame(delta: number): void
  setVisible(visible: boolean): void
}

const activeLayer = ref<ControllableLayer | null>(null)

export function useActiveLayer() {
  function setLayer(
    store: {
      frames: { timestamp: string; objectUrl: string | null }[]
      currentIndex: number
      isPlaying: boolean
      frameLoading: boolean
      showRadarFrame(index: number): void
      playRadar(): void
      pauseRadar(): void
      toggleRadar(): void
      changeRadarFrame(delta: number): void
      setVisible(visible: boolean): void
    },
    name = 'Unnamed Layer'
  ) {
    activeLayer.value?.pause()
    activeLayer.value?.setVisible(false)
    activeLayer.value = {
      name,
      frames: computed(() => store.frames),
      currentIndex: computed(() => store.currentIndex),
      isPlaying: computed(() => store.isPlaying),
      frameLoading: computed(() => store.frameLoading),

      showFrame: store.showRadarFrame.bind(store),
      play: store.playRadar.bind(store),
      pause: store.pauseRadar.bind(store),
      toggle: store.toggleRadar.bind(store),
      changeFrame: store.changeRadarFrame.bind(store),
      setVisible: store.setVisible.bind(store),
    }

    activeLayer.value?.setVisible(true)
    activeLayer.value?.showFrame(0)
  }

  function clearLayer() {
    activeLayer.value?.pause()
    activeLayer.value?.setVisible(false)
    activeLayer.value = null
  }

  return {
    activeLayer,
    setLayer,
    clearLayer,
  }
}