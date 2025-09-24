import type { ComputedRef, Ref } from 'vue'
import { computed, ref, unref } from 'vue'
import type { Frame } from './useImageSequenceLayer'

export interface ControllableLayer {
  name: string
  frames: ComputedRef<{ timestamp: string; objectUrl: string | null }[]>
  currentIndex: ComputedRef<number>
  isPlaying: ComputedRef<boolean>
  frameLoading: ComputedRef<boolean>
  opacity: ComputedRef<number>
  currentTimestamp: ComputedRef<string | null>
  animationSpeed: ComputedRef<number>

  showFrame(index: number): void
  showNearestTimestamp(ts: string): Promise<void>
  play(): void
  pause(): void
  toggle(): void
  changeFrame(delta: number): void
  setVisible(visible: boolean): void
  setOpacity(value: number): void
  setAnimationSpeed(value: number): void
  clear(): void
}

const activeLayer = ref<ControllableLayer | null>(null)

function toComputed<T>(source: Ref<T> | T): ComputedRef<T> {
  return computed(() => unref(source))
}

export function useActiveLayer() {
  async function setLayer(
    store: {
      frames: Ref<Frame[]> | Frame[]
      currentIndex: Ref<number> | number
      isPlaying: Ref<boolean> | boolean
      frameLoading: Ref<boolean> | boolean
      opacity: Ref<number> | number
      animationSpeed: Ref<number> | number
      currentTimestamp: Ref<string | null> | string | null

      showFrame(index: number): void
      showNearestTimestamp(ts: string): Promise<void>
      play(): void
      pause(): void
      toggle(): void
      changeFrame(delta: number): void
      setVisible(visible: boolean): void
      setOpacity(value: number): void
      setAnimationSpeed(value: number): void
      clear(): void
    },
    name = 'Unnamed Layer',
    // showLatestFrame: Ref<boolean, boolean>,
  ) {

    const prevTs = activeLayer.value?.currentTimestamp ?? null
    const prevOpacity = activeLayer.value?.opacity

    activeLayer.value?.pause()
    activeLayer.value?.setVisible(false)

    activeLayer.value = {
      name,
      frames: toComputed(store.frames),
      currentIndex: toComputed(store.currentIndex),
      isPlaying: toComputed(store.isPlaying),
      frameLoading: toComputed(store.frameLoading),
      opacity: toComputed(store.opacity),
      animationSpeed: toComputed(store.animationSpeed),
      currentTimestamp: toComputed(store.currentTimestamp),

      showFrame: store.showFrame.bind(store),
      showNearestTimestamp: store.showNearestTimestamp.bind(store),
      play: store.play.bind(store),
      pause: store.pause.bind(store),
      toggle: store.toggle.bind(store),
      changeFrame: store.changeFrame.bind(store),
      setVisible: store.setVisible.bind(store),
      setOpacity: store.setOpacity.bind(store),
      setAnimationSpeed: store.setAnimationSpeed.bind(store),
      clear: store.clear.bind(store),
    }

    activeLayer.value?.setVisible(true)

    if (prevOpacity != null) activeLayer.value?.setOpacity(prevOpacity)

    if (activeLayer.value) {
      if (prevTs) {
        await activeLayer.value.showNearestTimestamp(prevTs)
      }
      else {
        activeLayer.value?.showFrame(activeLayer.value.frames.length - 1)
      }
    }
  }

  function hideLayer() {
    activeLayer.value?.pause()
    activeLayer.value?.setVisible(false)
    activeLayer.value = null
  }

  function clearLayer() {
    activeLayer.value?.pause()
    activeLayer.value?.setVisible(false)
    activeLayer.value?.clear()
    activeLayer.value = null
  }

  return { activeLayer, setLayer, clearLayer, hideLayer }
}