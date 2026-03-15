import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'
import { connectSocket, disconnectSocket } from '../services/socket'
import { useNotificationStore } from './notificationStore'

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            _hasHydrated: false,
            hasCheckedAuth: false,

            setHasHydrated: (state) => set({ _hasHydrated: state }),

            setUser: (user) => set({ user, isAuthenticated: !!user }),

            silentRefresh: async () => {
                // If persist hasn't finished loading from localStorage yet, skip.
                // App.jsx waits for _hasHydrated before calling this.
                const { user, isAuthenticated, hasCheckedAuth } = get()
                
                if (hasCheckedAuth) return user;
                
                if (isAuthenticated && user) {
                    // Already authenticated — just reconnect the socket
                    connectSocket(user._id, user.role)
                    set({ hasCheckedAuth: true })
                    return user
                }
                // Not authenticated — verify with server
                try {
                    const { data } = await api.get('/auth/me')
                    set({ user: data.user, isAuthenticated: true, hasCheckedAuth: true })
                    connectSocket(data.user._id, data.user.role)
                    return data.user
                } catch {
                    set({ user: null, isAuthenticated: false, hasCheckedAuth: true })
                    return null
                }
            },

            login: (user) => {
                set({ user, isAuthenticated: true })
                connectSocket(user._id, user.role)
            },

            logout: async () => {
                try { await api.post('/auth/logout') } catch { }
                disconnectSocket()
                useNotificationStore.getState().clearNotifications()
                set({ user: null, isAuthenticated: false, hasCheckedAuth: false })
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login'
                }
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
            onRehydrateStorage: () => (state) => {
                // Called once persisted state has been loaded from localStorage.
                // Flip the flag so App.jsx knows it's safe to call silentRefresh.
                if (state) state.setHasHydrated(true)
            },
        }
    )
)

// Listen for forced logout signal from axios interceptor (avoids circular import)
if (typeof window !== 'undefined') {
    window.addEventListener('auth:logout', () => {
        useAuthStore.getState().logout()
    })

    // Session expired — show toast then logout
    window.addEventListener('auth:session-expired', (e) => {
        // Lazy import to avoid circular dep
        import('./uiStore').then(({ useUIStore }) => {
            useUIStore.getState().addToast(
                e.detail?.message || 'Your session has expired. Please log in again.',
                'error'
            )
        })
        setTimeout(() => useAuthStore.getState().logout(), 1500) // let toast show before redirect
    })
}