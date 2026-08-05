
import { defineStore } from 'pinia'

export type AuthResult = boolean | DirectusUser

interface AuthState {
  isAuthenticated: AuthResult
  checked: boolean
  lastToken: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    isAuthenticated: false,
    checked: false,
    lastToken: null,
  }),
  getters: {
    ready: (state) => state.isAuthenticated !== null, // store has returned
  },
  actions: {
    setAuth(result: AuthResult, token: string | null = null) {
      this.isAuthenticated = result
      this.checked = true
      this.lastToken = token
    },
    reset() {
      // Reset state to initial values
      this.isAuthenticated = false
      this.checked = false
      this.lastToken = null
    },
  },
})
