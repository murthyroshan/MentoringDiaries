import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { queryClient } from './services/queryClient'
import { useAuthStore, setNavigate } from './store/authStore'
import { useUIStore } from './store/uiStore'

// Layout
import DashboardLayout from './components/layout/DashboardLayout'

// Public Pages
import LandingPage from './pages/public/Landing'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard'
import SubmitEntry from './pages/student/SubmitEntry'
import MyEntries from './pages/student/MyEntries'
import Portfolio from './pages/student/Portfolio'
import StudentTimeline from './pages/student/StudentTimeline'
import StudentSessions from './pages/student/StudentSessions'
import EntryDetail from './pages/EntryDetail'

// Mentor Pages
import MentorDashboard from './pages/mentor/MentorDashboard'
import StudentsList from './pages/mentor/StudentsList'
import MentorEntries from './pages/mentor/MentorEntries'
import ReviewEntry from './pages/mentor/ReviewEntry'
import FlaggedEntries from './pages/mentor/FlaggedEntries'
import MentorSessions from './pages/mentor/MentorSessions'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import UserManagement from './pages/admin/UserManagement'
import AllEntries from './pages/admin/AllEntries'
import RiskMonitor from './pages/admin/RiskMonitor'
import NotFoundPage from './pages/NotFoundPage'

// UI
import ToastContainer from './components/ui/ToastContainer'
import CustomCursor from './components/ui/CustomCursor'

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const redirects = { student: '/dashboard', mentor: '/mentor', admin: '/admin' }
    return <Navigate to={redirects[user?.role] || '/login'} replace />
  }
  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore()
  if (isAuthenticated) {
    const redirects = { student: '/dashboard', mentor: '/mentor', admin: '/admin' }
    return <Navigate to={redirects[user?.role] || '/dashboard'} replace />
  }
  return children
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.key}>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Student */}
        <Route element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/submit" element={<SubmitEntry />} />
          <Route path="/my-entries" element={<MyEntries />} />
          <Route path="/timeline" element={<StudentTimeline />} />
          <Route path="/sessions" element={<StudentSessions />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/entries/:id" element={<EntryDetail />} />
        </Route>

        {/* Mentor */}
        <Route element={<ProtectedRoute allowedRoles={['mentor']}><DashboardLayout /></ProtectedRoute>}>
          <Route path="/mentor" element={<MentorDashboard />} />
          <Route path="/mentor/students" element={<StudentsList />} />
          <Route path="/mentor/sessions" element={<MentorSessions />} />
          <Route path="/mentor/entries" element={<MentorEntries />} />
          <Route path="/mentor/entries/:id/review" element={<ReviewEntry />} />
          <Route path="/mentor/flagged" element={<FlaggedEntries />} />
          <Route path="/mentor/entries/:id" element={<EntryDetail />} />
        </Route>

        {/* Admin */}
        <Route element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout /></ProtectedRoute>}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/entries" element={<AllEntries />} />
          <Route path="/admin/risk-monitor" element={<RiskMonitor />} />
          <Route path="/admin/entries/:id" element={<EntryDetail />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AnimatePresence>
  )
}

// Registers React Router's navigate function into the auth store so logout can
// perform a SPA redirect instead of a hard page reload.
function RouterNavigateSync() {
  const navigate = useNavigate()
  useEffect(() => { setNavigate(navigate) }, [navigate])
  return null
}

export default function App() {
  const { silentRefresh, _hasHydrated } = useAuthStore()
  const { initTheme } = useUIStore()

  // Run once on mount — just initialise the theme.
  useEffect(() => {
    initTheme()
  }, [])

  // silentRefresh must wait until Zustand has finished rehydrating from
  // localStorage, otherwise isAuthenticated is still false and we fire an
  // unnecessary /auth/me request even for already-logged-in users.
  useEffect(() => {
    if (_hasHydrated && window.location.pathname !== '/') {
      silentRefresh()
    }
  }, [_hasHydrated])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RouterNavigateSync />
        <CustomCursor />
        <AnimatedRoutes />
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
