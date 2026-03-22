import axios from 'axios'

const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
})

// Read the non-httpOnly CSRF cookie set by the server and attach it as a
// header on every mutating request so the server can verify it.
function getCsrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/)
    return match ? decodeURIComponent(match[1]) : ''
}

api.interceptors.request.use((config) => {
    const method = (config.method || '').toUpperCase()
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        config.headers['X-CSRF-Token'] = getCsrfToken()
    }
    return config
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error) => {
    failedQueue.forEach(prom => error ? prom.reject(error) : prom.resolve())
    failedQueue = []
}

function logApiError(error, context = 'api-error') {
    const requestId = error?.response?.data?.requestId
    const status = error?.response?.status
    const method = error?.config?.method?.toUpperCase()
    const url = error?.config?.url
    const message = error?.response?.data?.message || error?.message
    console.error(`[API:${context}]`, { method, url, status, requestId, message })
}

// Response interceptor: handle 401 -> silent refresh -> retry once
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error?.config
        if (!originalRequest) {
            logApiError(error, 'no-request-config')
            return Promise.reject(error)
        }

        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url.includes('/auth/refresh') &&
            !originalRequest.url.includes('/auth/login') &&
            !originalRequest.url.includes('/auth/me')
        ) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                })
                    .then(() => api(originalRequest))
                    .catch(err => Promise.reject(err))
            }

            originalRequest._retry = true
            isRefreshing = true

            try {
                await api.post('/auth/refresh')
                processQueue(null)
                return api(originalRequest)
            } catch (refreshError) {
                processQueue(refreshError)
                logApiError(refreshError, 'refresh-failed')
                const code = refreshError?.response?.data?.code
                const eventName = code === 'TOKEN_EXPIRED' ? 'auth:session-expired' : 'auth:logout'
                window.dispatchEvent(new CustomEvent(eventName, {
                    detail: { message: refreshError?.response?.data?.message || 'Session expired.' }
                }))
                return Promise.reject(refreshError)
            } finally {
                isRefreshing = false
            }
        }

        logApiError(error)
        return Promise.reject(error)
    }
)

// Safely extract an array from any API response shape.
// Tries each key in order; falls back to [] if nothing is an array.
export const extractArray = (response, keys = ['data', 'entries', 'users', 'sessions', 'results']) => {
    if (!response) return []
    if (Array.isArray(response)) return response
    for (const key of keys) {
        if (Array.isArray(response[key])) return response[key]
    }
    return []
}

export default api
