import { io } from 'socket.io-client'

let socket = null
let joinedUserId = null
let joinedRole = null
let currentJoin = null

export function getSocket() {
    if (!socket) {
        socket = io('/', {
            withCredentials: true,
            autoConnect: false,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
            timeout: 8000,
            transports: ['websocket', 'polling'],
        })

        socket.on('connect_error', (err) => {
            console.debug('[Socket] Connection error (non-fatal):', err.message)
        })

        socket.on('disconnect', (reason) => {
            console.debug('[Socket] Disconnected:', reason)
            // Rooms are per-connection and are lost on disconnect — clear the
            // guard so the next `connect` (auto-reconnect) re-joins them.
            joinedUserId = null
            joinedRole = null
        })
    }
    return socket
}

export function connectSocket(userId, role) {
    try {
        const s = getSocket()
        if (!userId) return s

        // Prevent duplicate join emissions for the same live connection.
        const joinRooms = () => {
            if (joinedUserId === userId && joinedRole === role) return
            s.emit('join', userId)
            if (role === 'admin') s.emit('join-admin')
            joinedUserId = userId
            joinedRole = role
        }

        // Register a PERSISTENT connect handler (not `.once`) so rooms are
        // re-joined after every reconnect, not just the first connect. Replace
        // any handler from a previous connectSocket call to avoid stacking.
        if (currentJoin) s.off('connect', currentJoin)
        currentJoin = joinRooms
        s.on('connect', joinRooms)

        if (!s.connected) s.connect()
        else joinRooms()

        return s
    } catch (err) {
        console.debug('[Socket] connectSocket failed (non-fatal):', err.message)
        return null
    }
}

export function disconnectSocket() {
    joinedUserId = null
    joinedRole = null
    if (socket && socket.connected) socket.disconnect()
}
