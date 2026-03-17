import { api } from '@/api';
import getSecureConfig from '@/cookies';
import { defineStore } from 'pinia';

interface AuthState {
  isLoggedIn: boolean | null;
  username: string | null;
  org: string | null;
  linkAccessType: 'basic' | 'full' | null;
  tokenExpiry: number | null,
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    isLoggedIn: null,
    username: null,
    org: null,
    linkAccessType: null,
    tokenExpiry: null
  }),

  getters: {
    hasBasicLinkAccess: (state) => state.isLoggedIn === true && state.linkAccessType === 'basic',
    hasFullLinkAccess: (state) => state.isLoggedIn === true && state.linkAccessType === 'full',
    canViewLinkPoints: (state) =>
      state.isLoggedIn === true &&
      (state.linkAccessType === 'basic' || state.linkAccessType === 'full'),
  },

  actions: {
    async checkLogin(): Promise<boolean> {
      try {
        const res = await api.get('/login-check', getSecureConfig())
        this.isLoggedIn = res.data.valid
        this.username = res.data.username ?? null
        this.org = res.data.org ?? null
        this.linkAccessType = res.data.link_access_type ?? null
        this.tokenExpiry = res.data.exp ?? null
        return this.isLoggedIn === true;
      } catch (err) {
        if (err instanceof Error) {
          console.error('Caught error:', err.message);
        } else {
          console.error('Unknown error:', err);
        }
        this.isLoggedIn = false;
        this.username = null;
        this.org = null;
        this.linkAccessType = null;
        this.tokenExpiry = null;
        return false;
      }
    },
    reset() {
      this.isLoggedIn = null;
      this.username = null;
      this.org = null;
      this.linkAccessType = null;
      this.tokenExpiry = null;
    },
  },
});
