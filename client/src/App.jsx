import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { queryClient } from './services/queryClient'
import { useAuthStore, setNavigate } from './store/authStore'
import { useUIStore } from './store/uiStore'

// Layout
import DashboardLayout from './components/layout/DashboardLayout'
import StudentLayout from './components/layout/StudentLayout'
import AdminLayout from './components/layout/AdminLayout'

// Public Pages
import LandingPage from './pages/public/Landing'
import LoginPage from './pages/public/Login'
import RegisterPage from './pages/public/Register'

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
import SectionReport from './pages/admin/SectionReport'
import StudentReport from './pages/admin/StudentReport'
import MentorManagement from './pages/admin/MentorManagement'
import NotFoundPage from './pages/NotFoundPage'

// UI
import ToastContainer from './components/ui/ToastContainer'
import CustomCursor from './components/ui/CustomCursor'

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const redirects = { student: '/student/dashboard', mentor: '/mentor/dashboard', admin: '/admin/dashboard' }
    return <Navigate to={redirects[user?.role] || '/login'} replace />
  }
  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore()
  if (isAuthenticated) {
    const redirects = { student: '/student/dashboard', mentor: '/mentor/dashboard', admin: '/admin/dashboard' }
    return <Navigate to={redirects[user?.role] || '/student/dashboard'} replace />
  }
  return children
}

function DashboardRedirect() {
  const { isAuthenticated, user } = useAuthStore()
  return isAuthenticated
    ? <Navigate to={`/${user?.role}/dashboard`} replace />
    : <Navigate to="/login" replace />
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.key}>
        {/* Public — landing is always visible, auth state handled inside */}
        <Route path="/" element={<LandingPage />} />
        {/* Legacy /dashboard catch */}
        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Student */}
        <Route element={<ProtectedRoute allowedRoles={['student']}><StudentLayout /></ProtectedRoute>}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/submit" element={<SubmitEntry />} />
          <Route path="/student/entries" element={<MyEntries />} />
          <Route path="/student/timeline" element={<StudentTimeline />} />
          <Route path="/student/sessions" element={<StudentSessions />} />
          <Route path="/student/portfolio" element={<Portfolio />} />
          <Route path="/student/entries/:id" element={<EntryDetail />} />
        </Route>

        {/* Mentor */}
        <Route element={<ProtectedRoute allowedRoles={['mentor']}><DashboardLayout /></ProtectedRoute>}>
          <Route path="/mentor/dashboard" element={<MentorDashboard />} />
          <Route path="/mentor/students" element={<StudentsList />} />
          <Route path="/mentor/sessions" element={<MentorSessions />} />
          <Route path="/mentor/entries" element={<MentorEntries />} />
          <Route path="/mentor/entries/:id/review" element={<ReviewEntry />} />
          <Route path="/mentor/flagged" element={<FlaggedEntries />} />
          <Route path="/mentor/entries/:id" element={<EntryDetail />} />
        </Route>
        {/* Legacy /mentor redirect */}
        <Route path="/mentor" element={<Navigate to="/mentor/dashboard" replace />} />

        {/* Admin */}
        <Route element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/entries" element={<AllEntries />} />
          <Route path="/admin/risk-monitor" element={<RiskMonitor />} />
          <Route path="/admin/sections" element={<SectionReport />} />
          <Route path="/admin/sections/:dept/:section" element={<SectionReport />} />
          <Route path="/admin/students/:id" element={<StudentReport />} />
          <Route path="/admin/mentors" element={<MentorManagement />} />
          <Route path="/admin/entries/:id" element={<EntryDetail />} />
        </Route>
        {/* Legacy /admin redirect */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

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
  // Note: no pathname guard — the GET /api/auth/me call also ensures the
  // CSRF cookie is set before any mutating request (e.g. POST /auth/login).
  // The hasCheckedAuth guard inside silentRefresh prevents duplicate calls.
  useEffect(() => {
    if (_hasHydrated) {
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
