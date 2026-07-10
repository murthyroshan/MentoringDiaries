import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

export const useNotificationStore = create(
    persist(
        (set, get) => ({
            notifications: [],
            unreadCount: 0,
            initialized: false,

            hydrateNotifications: async () => {
                try {
                    const res = await api.get('/notifications?limit=50')
                    const items = res.data?.data || []
                    set({
                        notifications: items.map((n) => ({
                            id: n._id || n.id,
                            type: n.type,
                            title: n.title,
                            message: n.message,
                            metadata: n.metadata || {},
                            read: !!n.read,
                            at: n.createdAt || n.timestamp || new Date().toISOString(),
                        })),
                        unreadCount: res.data?.unreadCount || 0,
                        initialized: true,
                    })
                } catch {
                    set({ initialized: true })
                }
            },

            addNotification: (notif) => {
                const id = notif.id || Date.now().toString()
                set((s) => ({
                    notifications: [{
                        id,
                        type: notif.type || 'system:announcement',
                        title: notif.title || 'Notification',
                        message: notif.message,
                        metadata: notif.metadata || {},
                        read: false,
                        at: notif.timestamp || notif.at || new Date().toISOString(),
                    }, ...s.notifications].slice(0, 100),
                    unreadCount: s.unreadCount + 1,
                }))
            },

            markRead: async (id) => {
                set((s) => ({
                    notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
                    unreadCount: Math.max(0, s.unreadCount - (s.notifications.find((n) => n.id === id && !n.read) ? 1 : 0)),
                }))
                try { await api.patch(`/notifications/${id}/read`) } catch { }
            },

            markAllRead: async () => {
                set((s) => ({
                    notifications: s.notifications.map((n) => ({ ...n, read: true })),
                    unreadCount: 0,
                }))
                try { await api.patch('/notifications/read-all') } catch { }
            },

            // Reset `initialized` too, otherwise the next user to log in on the
            // same SPA session (no page reload) never re-hydrates and sees the
            // previous user's empty/stale list.
            clearNotifications: () => set({ notifications: [], unreadCount: 0, initialized: false }),
        }),
        {
            name: 'notification-storage',
            partialize: (state) => ({
                notifications: state.notifications,
                unreadCount: state.unreadCount,
            }),
        }
    )
)

