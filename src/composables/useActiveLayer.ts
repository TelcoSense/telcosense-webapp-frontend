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
      showFrame(index: number): void
      play(): void
      pause(): void
      toggle(): void
      changeFrame(delta: number): void
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

      showFrame: store.showFrame.bind(store),
      play: store.play.bind(store),
      pause: store.pause.bind(store),
      toggle: store.toggle.bind(store),
      changeFrame: store.changeFrame.bind(store),
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