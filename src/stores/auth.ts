import { api } from '@/api';
import getSecureConfig from '@/cookies';
import { defineStore } from 'pinia';

interface AuthState {
  isLoggedIn: boolean | null;
  username: string | null;
  org: string | null;
  tokenExpiry: number | null,
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    isLoggedIn: null,
    username: null,
    org: null,
    tokenExpiry: null
  }),

  actions: {
    async checkLogin(): Promise<boolean> {
      try {
        const res = await api.get('/login-check', getSecureConfig())
        this.isLoggedIn = res.data.valid
        this.username = res.data.username ?? null
        this.org = res.data.org ?? null
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
        return false;
      }
    },
    reset() {
      this.isLoggedIn = null;
      this.username = null;
      this.org = null;
      this.tokenExpiry = null;
    },
  },
});