import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
// import Profile from './pages/Profile'
import Settings from './pages/Settings'
import BdLogin from './pages/BdLogin'
import BdLayout from './pages/bd/BdLayout'
import BdDashboardOverview from './pages/bd/BdDashboardOverview'
import BdCreateLead from './pages/bd/BdCreateLead'
import BdAssignedProfiles from './pages/bd/BdAssignedProfiles'
import BdYourLeads from './pages/bd/BdYourLeads'
import BdSignup from './pages/BdSignup'
import Checkout from './pages/Checkout'
import VerifyEmail from './pages/VerifyEmail'
import CheckoutSuccess from './pages/CheckoutSuccess'
import Start from './pages/Start'
import SetPassword from './pages/SetPassword'
import AdminLogin from './pages/AdminLogin'
import { AuthProvider } from './context/AuthContext.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import AdminRoute from './routes/AdminRoute.jsx'
import BdRoute from './routes/BdRoute.jsx'
import Onboarding from './pages/Onboarding'
import ProfileBuilder from './pages/ProfileBuilder'
import Auth from './pages/Auth'
import ResumeMaker from './pages/ResumeMaker'
import UploadCv from './pages/UploadCv'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboardOverview from './pages/admin/AdminDashboardOverview'
import AdminPlans from './pages/admin/AdminPlans'
import AdminUsers from './pages/admin/AdminUsers'
import AdminLeads from './pages/admin/AdminLeads'
import AdminBds from './pages/admin/AdminBds'
import AdminSubscriptions from './pages/admin/AdminSubscriptions'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/upload_cv" element={<UploadCv />} />
          {/* Both /profile and /profile-builder show ProfileBuilder */}
          <Route path="/profile-builder" element={<ProfileBuilder />} />
          <Route path="/resume-maker" element={<ProtectedRoute><ResumeMaker /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/bd/login" element={<BdLogin />} />
          <Route path="/bd/signup" element={<BdSignup />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/start" element={<Start />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/success" element={<CheckoutSuccess />} />
          <Route path="/checkout-success" element={<CheckoutSuccess />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboardOverview />} />
            <Route path="plans" element={<AdminPlans />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="leads" element={<AdminLeads />} />
            <Route path="bds" element={<AdminBds />} />
            <Route path="subscriptions" element={<AdminSubscriptions />} />
          </Route>
          <Route path="/bd" element={<BdRoute><BdLayout /></BdRoute>}>
            <Route index element={<BdDashboardOverview />} />
            <Route path="create-lead" element={<BdCreateLead />} />
            <Route path="assigned-profiles" element={<BdAssignedProfiles />} />
            <Route path="leads" element={<BdYourLeads />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
