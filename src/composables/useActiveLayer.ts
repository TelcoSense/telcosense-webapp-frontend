import type { ComputedRef, Ref } from 'vue';
import { computed, ref, unref } from 'vue';
import type { Frame } from './useImageSequenceLayer';

export interface ControllableLayer {
  name: string
  frames: ComputedRef<{ timestamp: string; objectUrl: string | null }[]>
  currentIndex: ComputedRef<number>
  isPlaying: ComputedRef<boolean>
  frameLoading: ComputedRef<boolean>
  opacity: ComputedRef<number>

  showFrame(index: number): void
  play(): void
  pause(): void
  toggle(): void
  changeFrame(delta: number): void
  setVisible(visible: boolean): void
  setOpacity(value: number): void
}

const activeLayer = ref<ControllableLayer | null>(null)

function toComputed<T>(source: Ref<T> | T): ComputedRef<T> {
  return computed(() => unref(source))
}

export function useActiveLayer() {
  function setLayer(
    store: {
      frames: Ref<Frame[]> | Frame[]
      currentIndex: Ref<number> | number
      isPlaying: Ref<boolean> | boolean
      frameLoading: Ref<boolean> | boolean
      opacity: Ref<number> | number

      showFrame(index: number): void
      play(): void
      pause(): void
      toggle(): void
      changeFrame(delta: number): void
      setVisible(visible: boolean): void
      setOpacity(value: number): void
    },
    name = 'Unnamed Layer'
  ) {
    activeLayer.value?.pause()
    activeLayer.value?.setVisible(false)

    activeLayer.value = {
      name,
      frames: toComputed(store.frames),
      currentIndex: toComputed(store.currentIndex),
      isPlaying: toComputed(store.isPlaying),
      frameLoading: toComputed(store.frameLoading),
      opacity: toComputed(store.opacity),

      showFrame: store.showFrame.bind(store),
      play: store.play.bind(store),
      pause: store.pause.bind(store),
      toggle: store.toggle.bind(store),
      changeFrame: store.changeFrame.bind(store),
      setVisible: store.setVisible.bind(store),
      setOpacity: store.setOpacity.bind(store)
    }
    if (activeLayer.value) {
      activeLayer.value.setVisible(true)
      activeLayer.value.showFrame(0)
    }
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