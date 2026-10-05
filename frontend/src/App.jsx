import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'

// Public
import LandingPage from './pages/public/LandingPage.jsx'

// Auth
import SignInPage from './pages/auth/SignInPage.jsx'
import SignUpUserPage from './pages/auth/SignUpUserPage.jsx'
import SignUpStakeholderPage from './pages/auth/SignUpStakeholderPage.jsx'
import AdminSignInPage from './pages/admin/AdminSignInPage.jsx'

// User (Pelapor)
import ComplaintForm from './pages/user/ComplaintForm.jsx'
import MyComplaints from './pages/user/MyComplaints.jsx'
import ComplaintTracking from './pages/user/ComplaintTracking.jsx'

// Stakeholder (Unit Kerja)
import StakeholderDashboard from './pages/stakeholder/Dashboard.jsx'
import Complaints from './pages/stakeholder/Complaints.jsx'
import ComplaintDetail from './pages/stakeholder/ComplaintDetail.jsx'
import Analytics from './pages/stakeholder/Analytics.jsx'
import Followups from './pages/stakeholder/Followups.jsx'
import Evidence from './pages/stakeholder/evidence.jsx'
import Settings from './pages/stakeholder/settings.jsx'

// Administrator (Jalur Khusus Admin Sentral)
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminVerification from './pages/admin/AdminVerification.jsx'
import AdminDisposition from './pages/admin/AdminDisposition.jsx'
import AdminComplaintList from './pages/admin/AdminComplaintList.jsx'

/** Route guard — redirect unauthenticated or unauthorized users */
function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
    )
  }
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
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth */}
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup-user" element={<SignUpUserPage />} />
        <Route path="/signup-stakeholder" element={<SignUpStakeholderPage />} />

        {/* User Area (Pelapor Sivitas PENS) */}
        <Route path="/user/submit" element={<ProtectedRoute role="user"><ComplaintForm /></ProtectedRoute>} />
        <Route path="/user/complaints" element={<ProtectedRoute role="user"><MyComplaints /></ProtectedRoute>} />
        <Route path="/user/complaints/:id" element={<ProtectedRoute role="user"><ComplaintTracking /></ProtectedRoute>} />
        <Route path="/user/dashboard" element={<ProtectedRoute role="user"><MyComplaints /></ProtectedRoute>} />

        {/* Stakeholder Area (Unit Kerja Pelaksana) */}
        <Route path="/stakeholder" element={<ProtectedRoute role="stakeholder"><StakeholderDashboard /></ProtectedRoute>} />
        <Route path="/stakeholder/complaints" element={<ProtectedRoute role="stakeholder"><Complaints /></ProtectedRoute>} />
        <Route path="/stakeholder/complaints/:id" element={<ProtectedRoute role="stakeholder"><ComplaintDetail /></ProtectedRoute>} />
        <Route path="/stakeholder/analytics" element={<ProtectedRoute role="stakeholder"><Analytics /></ProtectedRoute>} />
        <Route path="/stakeholder/followups" element={<ProtectedRoute role="stakeholder"><Followups /></ProtectedRoute>} />
        <Route path="/stakeholder/evidence" element={<ProtectedRoute role="stakeholder"><Evidence /></ProtectedRoute>} />
        <Route path="/stakeholder/settings" element={<ProtectedRoute role="stakeholder"><Settings /></ProtectedRoute>} />

        {/* Administrator Area (Jalur Sentral Khusus Admin) */}
        <Route path="/admin/signin" element={<AdminSignInPage />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/verifikasi" element={<ProtectedRoute role="admin"><AdminVerification /></ProtectedRoute>} />
        <Route path="/admin/disposisi" element={<ProtectedRoute role="admin"><AdminDisposition /></ProtectedRoute>} />
        <Route path="/admin/complaints" element={<ProtectedRoute role="admin"><AdminComplaintList /></ProtectedRoute>} />

        {/* 404 Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}