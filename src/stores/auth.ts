import { api } from '@/api';
import getSecureConfig from '@/cookies';
import { defineStore } from 'pinia';

interface AuthState {
  isLoggedIn: boolean | null;
  username: string | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    isLoggedIn: null,
    username: null,
  }),

  actions: {
    async checkLogin(): Promise<boolean> {
      try {
        const res = await api.get('/login-check', getSecureConfig());
        this.isLoggedIn = res.data.valid;
        this.username = res.data.username ?? null;
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
    },
  },
});