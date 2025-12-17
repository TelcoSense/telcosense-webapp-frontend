import { defineStore } from 'pinia';

interface ConfigState {
  realtime: boolean;
  start: string | null;
  end: string | null;
  datetimeFormat: 'UTC' | 'Europe/Prague';
  dataPlottingVisible: boolean;
  mainLayerSwitcherVisible: boolean;
  secondaryLayerSwitcherVisible: boolean;
  layerControlsVisible: boolean;
  linkFilterVisible: boolean;
  clustersVisible: boolean;
  barVisible: boolean;
  splitView: boolean;
}

export const useConfigStore = defineStore('config', {
  state: (): ConfigState => ({
    realtime: true,
    start: null,
    end: null,
    datetimeFormat: 'UTC',
    dataPlottingVisible: false,
    mainLayerSwitcherVisible: false,
    secondaryLayerSwitcherVisible: false,
    layerControlsVisible: false,
    linkFilterVisible: false,
    clustersVisible: false,
    barVisible: false,
    splitView: true
  }),

  actions: {
    setToRealtime() {
      this.realtime = true;
      this.start = null;
      this.end = null;
    },

    setToHistoric() {
      this.realtime = false;
    },

    toggleDatetimeFormat() {
      this.datetimeFormat =
        this.datetimeFormat === 'UTC' ? 'Europe/Prague' : 'UTC';
    },

    enableSplitView() {
      this.splitView = true;
    },

    disableSplitView() {
      this.splitView = false;
    },

    toggleSplitView() {
      this.splitView = !this.splitView;
    }
  },
});