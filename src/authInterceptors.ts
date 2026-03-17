import axios from 'axios'
import type { Pinia } from 'pinia'
import type { Router } from 'vue-router'

import { api } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { resetSessionState } from '@/utils/resetSessionState'

const AUTH_ERROR_CODES = new Set([
  'auth_required',
  'fresh_token_required',
  'invalid_token',
  'session_expired',
  'token_expired',
  'token_revoked',
  'user_not_found',
])

let installed = false
let handlingAuthFailure = false

export function installAuthInterceptors(pinia: Pinia, router: Router) {
  if (installed) return
  installed = true

  api.interceptors.response.use(
    (response) => {
      const auth = useAuthStore(pinia)
      const expHeader = response.headers['x-token-expires']
      const sessionExpHeader = response.headers['x-session-expires']

      if (auth.isLoggedIn) {
        auth.updateSessionMetadata(expHeader, sessionExpHeader)
      }

      return response
    },
    async (error) => {
      if (!axios.isAxiosError(error)) {
        return Promise.reject(error)
      }

      const auth = useAuthStore(pinia)
      const status = error.response?.status
      const code = error.response?.data?.code

      if (
        auth.isLoggedIn &&
        !handlingAuthFailure &&
        (status === 401 || status === 422) &&
        typeof code === 'string' &&
        AUTH_ERROR_CODES.has(code)
      ) {
        handlingAuthFailure = true
        resetSessionState(pinia)
        await router.push({ name: 'login' })
        handlingAuthFailure = false
      }

      return Promise.reject(error)
    },
  )
}
