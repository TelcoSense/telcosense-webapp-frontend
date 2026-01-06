import { computed, ref, unref, type ComputedRef, type Ref } from 'vue'
import type { Frame } from './useImageSequenceLayer'

export interface ControllableLayer {
  id: string
  name: string
  frames: ComputedRef<Frame[]>
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

function toComputed<T>(source: Ref<T> | T): ComputedRef<T> {
  return computed(() => unref(source))
}

export function createActiveLayerManager() {
  const activeLayer = ref<ControllableLayer | null>(null)

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
    id = 'Default',
    name = 'Default',
    initialTimestamp?: string | null
  ) {

    const prevTs = initialTimestamp ?? activeLayer.value?.currentTimestamp ?? null
    const prevOpacity = activeLayer.value?.opacity
    const prevAnimationSpeed = activeLayer.value?.animationSpeed

    activeLayer.value?.pause()
    activeLayer.value?.setVisible(false)

    activeLayer.value = {
      id,
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

    const layer = activeLayer.value!
    layer.setVisible(true)
    if (prevOpacity != null) layer.setOpacity(prevOpacity)
    if (prevAnimationSpeed != null) layer.setAnimationSpeed(prevAnimationSpeed)
    if (prevTs) {
      await layer.showNearestTimestamp(prevTs)
    } else {
      layer.showFrame(layer.frames.length - 1)
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