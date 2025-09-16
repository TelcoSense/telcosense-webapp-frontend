import { defineStore } from 'pinia';

interface ConfigState {
  realtime: boolean;
  start: string | null;
  end: string | null;
  datetimeFormat: 'UTC' | 'Europe/Prague';
}

export const useConfigStore = defineStore('config', {
  state: (): ConfigState => ({
    realtime: true,
    start: null,
    end: null,
    datetimeFormat: 'UTC',
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
      this.datetimeFormat = this.datetimeFormat === 'UTC' ? 'Europe/Prague' : 'UTC';
    }
  },
});