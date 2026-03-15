import { io } from 'socket.io-client'

let socket = null
let joinedUserId = null
let joinedRole = null

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
        })
    }
    return socket
}

export function connectSocket(userId, role) {
    try {
        const s = getSocket()
        if (!userId) return s

        // Prevent duplicate join emissions for the same user session.
        const joinRooms = () => {
            if (joinedUserId === userId && joinedRole === role) return
            s.emit('join', userId)
            if (role === 'admin') s.emit('join-admin')
            joinedUserId = userId
            joinedRole = role
        }

        if (!s.connected) s.connect()
        if (s.connected) {
            joinRooms()
        } else {
            s.once('connect', joinRooms)
        }

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
