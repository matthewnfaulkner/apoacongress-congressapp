
import { defineStore } from 'pinia'

type AuthResult = boolean | DirectusUser

interface AuthState {
  isAuthenticated: AuthResult
  checked: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    isAuthenticated: false,
    checked: false,
  }),
  getters: {
    ready: (state) => state.isAuthenticated !== null, // store has returned
  },
  actions: {
    setAuth(result: AuthResult) {
      this.isAuthenticated = result
      this.checked = true
    },
    reset() {
      // Reset state to initial values
      this.isAuthenticated = false
      this.checked = false
    },
  },
})
