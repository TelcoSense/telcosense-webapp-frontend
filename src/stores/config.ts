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
  datetimeSelectorVisible: boolean;
  splitView: boolean;
  followPrimary: boolean;
  layerSwitchedTime: Date | null;
}

export const useConfigStore = defineStore('config', {
  state: (): ConfigState => ({
    realtime: true,
    start: null,
    end: null,
    datetimeFormat: 'UTC',

    // visibility
    dataPlottingVisible: false,
    mainLayerSwitcherVisible: false,
    secondaryLayerSwitcherVisible: false,

    layerControlsVisible: false,
    linkFilterVisible: false,
    clustersVisible: false,
    barVisible: false,
    datetimeSelectorVisible: false,

    // split view
    splitView: false,
    followPrimary: true,
    layerSwitchedTime: null,
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

    toggleRealtime() {
      if (this.realtime) {
        this.realtime = false
      }
      else {
        this.realtime = true;
        this.start = null;
        this.end = null;
      }
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
    },

    setLayerSwitchedTime() {
      this.layerSwitchedTime = new Date()
    }
  },
});