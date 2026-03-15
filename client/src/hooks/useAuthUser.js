import { useAuthStore } from '../store/authStore'

export function useAuthUser() {
    return useAuthStore((s) => s.user)
}
