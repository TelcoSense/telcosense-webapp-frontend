import { defineStore } from 'pinia';

interface ConfigState {
  realtime: boolean;
  start: string | null;
  end: string | null;
}

export const useConfigStore = defineStore('config', {
  state: (): ConfigState => ({
    realtime: true,
    start: null,
    end: null,
  }),

  actions: {
    setToRealtime() {
      this.realtime = true;
      this.start = null;
      this.end = null;
    },

    setToHistoric() {
      this.realtime = false;
    }
  },
});