import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'

import ErrorBoundary from './components/ui/ErrorBoundary.jsx'

// LandingPage di-load eager (first paint paling penting)
import LandingPage from './pages/public/LandingPage.jsx'

// ── Auth (lazy) ──────────────────────────────────────────────────────────────
const SignInPage             = lazy(() => import('./pages/auth/SignInPage.jsx'))
const SignUpUserPage         = lazy(() => import('./pages/auth/SignUpUserPage.jsx'))
const SignUpStakeholderPage  = lazy(() => import('./pages/auth/SignUpStakeholderPage.jsx'))
const AdminSignInPage        = lazy(() => import('./pages/admin/AdminSignInPage.jsx'))

// ── User / Pelapor (lazy) ────────────────────────────────────────────────────
const ComplaintForm          = lazy(() => import('./pages/user/ComplaintForm.jsx'))
const MyComplaints           = lazy(() => import('./pages/user/MyComplaints.jsx'))
const ComplaintTracking      = lazy(() => import('./pages/user/ComplaintTracking.jsx'))

// ── Stakeholder / Unit Kerja (lazy) ──────────────────────────────────────────
const StakeholderDashboard   = lazy(() => import('./pages/stakeholder/Dashboard.jsx'))
const Complaints             = lazy(() => import('./pages/stakeholder/Complaints.jsx'))
const ComplaintDetail        = lazy(() => import('./pages/stakeholder/ComplaintDetail.jsx'))
const Analytics              = lazy(() => import('./pages/stakeholder/Analytics.jsx'))
const Followups              = lazy(() => import('./pages/stakeholder/Followups.jsx'))
const Evidence               = lazy(() => import('./pages/stakeholder/evidence.jsx'))
const Settings               = lazy(() => import('./pages/stakeholder/settings.jsx'))

// ── Administrator (lazy) ─────────────────────────────────────────────────────
const AdminDashboard         = lazy(() => import('./pages/admin/AdminDashboard.jsx'))
const AdminVerification      = lazy(() => import('./pages/admin/AdminVerification.jsx'))
const AdminDisposition       = lazy(() => import('./pages/admin/AdminDisposition.jsx'))
const AdminComplaintList     = lazy(() => import('./pages/admin/AdminComplaintList.jsx'))

/** Spinner yang digunakan sebagai fallback Suspense */
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="w-8 h-8 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
    </div>
  )
}

/** Route guard: redirect unauthenticated or unauthorized users */
function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/signin" replace />
  if (role && user.role !== role) {
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />
    if (user.role === 'stakeholder') return <Navigate to="/stakeholder" replace />
    return <Navigate to="/user/dashboard" replace />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <a href="#main-content" className="skip-link">
        Loncat ke konten utama
      </a>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />

            {/* Auth */}
            <Route path="/signin"             element={<SignInPage />} />
            <Route path="/signup-user"        element={<SignUpUserPage />} />
            <Route path="/signup-stakeholder" element={<SignUpStakeholderPage />} />

            {/* User Area (Pelapor Sivitas PENS) */}
            <Route path="/user/submit"          element={<ProtectedRoute role="user"><ComplaintForm /></ProtectedRoute>} />
            <Route path="/user/complaints"      element={<ProtectedRoute role="user"><MyComplaints /></ProtectedRoute>} />
            <Route path="/user/complaints/:id"  element={<ProtectedRoute role="user"><ComplaintTracking /></ProtectedRoute>} />
            <Route path="/user/dashboard"       element={<ProtectedRoute role="user"><MyComplaints /></ProtectedRoute>} />

            {/* Stakeholder Area (Unit Kerja Pelaksana) */}
            <Route path="/stakeholder"                element={<ProtectedRoute role="stakeholder"><StakeholderDashboard /></ProtectedRoute>} />
            <Route path="/stakeholder/complaints"     element={<ProtectedRoute role="stakeholder"><Complaints /></ProtectedRoute>} />
            <Route path="/stakeholder/complaints/:id" element={<ProtectedRoute role="stakeholder"><ComplaintDetail /></ProtectedRoute>} />
            <Route path="/stakeholder/analytics"      element={<ProtectedRoute role="stakeholder"><Analytics /></ProtectedRoute>} />
            <Route path="/stakeholder/followups"      element={<ProtectedRoute role="stakeholder"><Followups /></ProtectedRoute>} />
            <Route path="/stakeholder/evidence"       element={<ProtectedRoute role="stakeholder"><Evidence /></ProtectedRoute>} />
            <Route path="/stakeholder/settings"       element={<ProtectedRoute role="stakeholder"><Settings /></ProtectedRoute>} />

            {/* Administrator Area (Jalur Sentral Khusus Admin) */}
            <Route path="/admin/signin"     element={<AdminSignInPage />} />
            <Route path="/admin"            element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard"  element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/verifikasi" element={<ProtectedRoute role="admin"><AdminVerification /></ProtectedRoute>} />
            <Route path="/admin/disposisi"  element={<ProtectedRoute role="admin"><AdminDisposition /></ProtectedRoute>} />
            <Route path="/admin/complaints" element={<ProtectedRoute role="admin"><AdminComplaintList /></ProtectedRoute>} />

            {/* 404 Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
