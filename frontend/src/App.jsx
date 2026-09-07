import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'

// Public
import LandingPage           from './pages/public/LandingPage.jsx'
// Auth
import SignInPage            from './pages/auth/SignInPage.jsx'
import SignUpUserPage        from './pages/auth/SignUpUserPage.jsx'
import SignUpStakeholderPage from './pages/auth/SignUpStakeholderPage.jsx'
// User
import ComplaintForm  from './pages/user/ComplaintForm.jsx'
import MyComplaints   from './pages/user/MyComplaints.jsx'
// Stakeholder
import StakeholderDashboard from './pages/stakeholder/Dashboard.jsx'
import Complaints           from './pages/stakeholder/Complaints.jsx'
import ComplaintDetail      from './pages/stakeholder/ComplaintDetail.jsx'
import Analytics            from './pages/stakeholder/Analytics.jsx'
import Followups            from './pages/stakeholder/Followups.jsx'

/** Route guard — redirect unauthenticated users */
function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
    <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
  </div>
  if (!user) return <Navigate to="/signin" replace />
  if (role && user.role !== role) return <Navigate to={user.role === 'stakeholder' ? '/stakeholder' : '/user/dashboard'} replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/"                  element={<LandingPage />} />

        {/* Auth */}
        <Route path="/signin"            element={<SignInPage />} />
        <Route path="/signup-user"       element={<SignUpUserPage />} />
        <Route path="/signup-stakeholder"element={<SignUpStakeholderPage />} />

        {/* User Area */}
        <Route path="/user/submit"       element={<ProtectedRoute role="user"><ComplaintForm /></ProtectedRoute>} />
        <Route path="/user/complaints"   element={<ProtectedRoute role="user"><MyComplaints /></ProtectedRoute>} />
        <Route path="/user/dashboard"    element={<ProtectedRoute role="user"><MyComplaints /></ProtectedRoute>} />

        {/* Stakeholder Area */}
        <Route path="/stakeholder"                     element={<ProtectedRoute role="stakeholder"><StakeholderDashboard /></ProtectedRoute>} />
        <Route path="/stakeholder/complaints"          element={<ProtectedRoute role="stakeholder"><Complaints /></ProtectedRoute>} />
        <Route path="/stakeholder/complaints/:id"      element={<ProtectedRoute role="stakeholder"><ComplaintDetail /></ProtectedRoute>} />
        <Route path="/stakeholder/analytics"           element={<ProtectedRoute role="stakeholder"><Analytics /></ProtectedRoute>} />
        <Route path="/stakeholder/followups"           element={<ProtectedRoute role="stakeholder"><Followups /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
