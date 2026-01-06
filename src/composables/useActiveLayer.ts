import { createActiveLayerManager } from './useActiveLayerManager'

const main = createActiveLayerManager()
const secondary = createActiveLayerManager()

export function useActiveLayer() {
  return {
    activeLayerMain: main.activeLayer,
    setMainLayer: main.setLayer,
    hideMainLayer: main.hideLayer,
    clearMainLayer: main.clearLayer,

    activeLayerSecondary: secondary.activeLayer,
    setSecondaryLayer: secondary.setLayer,
    hideSecondaryLayer: secondary.hideLayer,
    clearSecondaryLayer: secondary.clearLayer,
  }
}