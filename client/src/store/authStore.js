import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'
import { connectSocket, disconnectSocket } from '../services/socket'
import { useNotificationStore } from './notificationStore'

// Router navigate ref — registered by a component inside <BrowserRouter> so the
// store can perform SPA navigation without triggering a full page reload.
let _navigate = null
export const setNavigate = (fn) => { _navigate = fn }

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
                const { hasCheckedAuth } = get()
                if (hasCheckedAuth) return get().user;

                // Reconnect the socket immediately using cached minimal data so the UI
                // feels instant on hard refresh, then overwrite with fresh server data.
                const cached = get().user
                if (cached?._id) connectSocket(cached._id, cached.role)

                // Always call /auth/me — gets the full user object (with populated
                // assignedMentor etc.) and confirms the token is still valid.
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
                    if (_navigate) {
                        _navigate('/login', { replace: true })
                    } else {
                        window.location.href = '/login'
                    }
                }
            },
        }),
        {
            name: 'auth-storage',
            // Only persist the minimal fields needed to reconnect the socket on
            // hard refresh. Full user data is always fetched fresh from /auth/me.
            partialize: (state) => ({
                user: state.user
                    ? { _id: state.user._id, name: state.user.name, role: state.user.role }
                    : null,
                isAuthenticated: state.isAuthenticated,
            }),
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

    // Session expired — show toast then logout.
    // The axios interceptor already attempted a token refresh before firing this event,
    // so both tokens are expired. Give the user 8 seconds to see the message and save
    // any in-progress work before the redirect happens.
    window.addEventListener('auth:session-expired', (e) => {
        import('./uiStore').then(({ useUIStore }) => {
            useUIStore.getState().addToast(
                e.detail?.message || 'Your session has expired. You will be logged out in a few seconds.',
                'error',
                8000
            )
        })
        setTimeout(() => useAuthStore.getState().logout(), 8000)
    })
}