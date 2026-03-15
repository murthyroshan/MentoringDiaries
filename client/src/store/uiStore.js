import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUIStore = create(
    persist(
        (set, get) => ({
            darkMode: false,
            sidebarOpen: true,
            toasts: [],
            toastIdCounter: 0,

            toggleDarkMode: () => {
                const next = !get().darkMode
                set({ darkMode: next })
                document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
            },

            initTheme: () => {
                const { darkMode } = get()
                document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
            },

            toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
            setSidebarOpen: (val) => set({ sidebarOpen: val }),

            addToast: (message, type = 'info', duration = 4000) => {
                const id = get().toastIdCounter + 1
                set((s) => ({
                    toasts: [...s.toasts, { id, message, type, duration }],
                    toastIdCounter: id,
                }))
                if (duration > 0) {
                    setTimeout(() => get().removeToast(id), duration)
                }
                return id
            },

            removeToast: (id) =>
                set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

            clearToasts: () => set({ toasts: [] }),
        }),
        {
            name: 'ui-storage',
            partialize: (s) => ({ darkMode: s.darkMode, sidebarOpen: s.sidebarOpen }),
        }
    )
)
