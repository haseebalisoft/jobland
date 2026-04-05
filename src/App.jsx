import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import DashboardApplications from './pages/DashboardApplications.jsx'
// import Profile from './pages/Profile'
import Settings from './pages/Settings'
import BdLogin from './pages/BdLogin'
import BdLayout from './pages/bd/BdLayout'
import BdDashboardOverview from './pages/bd/BdDashboardOverview'
import BdCreateLead from './pages/bd/BdCreateLead'
import BdAssignedProfiles from './pages/bd/BdAssignedProfiles'
import BdYourLeads from './pages/bd/BdYourLeads'
import BdInterviewDetails from './pages/bd/BdInterviewDetails'
import BdSettings from './pages/bd/BdSettings'
import BdResumes from './pages/bd/BdResumes'
import BdSignup from './pages/BdSignup'
import Checkout from './pages/Checkout'
import Billing from './pages/Billing'
import VerifyEmail from './pages/VerifyEmail'
import CheckoutSuccess from './pages/CheckoutSuccess'
import Start from './pages/Start'
import SetPassword from './pages/SetPassword'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AdminLogin from './pages/AdminLogin'
import { AuthProvider } from './context/AuthContext.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import AdminRoute from './routes/AdminRoute.jsx'
import BdRoute from './routes/BdRoute.jsx'
import Onboarding from './pages/Onboarding'
import ProfileBuilder from './pages/ProfileBuilder'
import ResumeMaker from './pages/ResumeMaker'
import FreeTierResumeTools from './pages/FreeTierResumeTools'
import UploadCv from './pages/UploadCv'
import PaidRoute from './routes/PaidRoute.jsx'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboardOverview from './pages/admin/AdminDashboardOverview'
import AdminPlans from './pages/admin/AdminPlans'
import AdminUsers from './pages/admin/AdminUsers'
import AdminLeads from './pages/admin/AdminLeads'
import AdminBds from './pages/admin/AdminBds'
import AdminSubscriptions from './pages/admin/AdminSubscriptions'
import UserLeadHelp from './pages/UserLeadHelp'
import BdLeadHelp from './pages/bd/BdLeadHelp'
import MockInterviewsIndex from './pages/dashboard/mock-interviews/MockInterviewsIndex.jsx'
import MockInterviewSetup from './pages/dashboard/mock-interviews/SetupPage.jsx'
import MockInterviewSession from './pages/dashboard/mock-interviews/SessionPage.jsx'
import MockInterviewReport from './pages/dashboard/mock-interviews/ReportPage.jsx'
import MockInterviewHistory from './pages/dashboard/mock-interviews/HistoryPage.jsx'
import AdminMockInterviews from './pages/admin/AdminMockInterviews.jsx'
import AdminMockInterviewAnalytics from './pages/admin/AdminMockInterviewAnalytics.jsx'
import ApplicationMaterialsLayout from './pages/dashboard/application-materials/ApplicationMaterialsLayout.jsx'
import DocumentsPage from './pages/dashboard/application-materials/DocumentsPage.jsx'
import LinkedInPage from './pages/dashboard/application-materials/LinkedInPage.jsx'
import CoverLettersPage from './pages/dashboard/application-materials/CoverLettersPage.jsx'
import ChatWidget from './components/chat-support/ChatWidget.jsx'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChatWidget />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/onboarding" element={<PaidRoute><Onboarding /></PaidRoute>} />
          <Route path="/upload_cv" element={<PaidRoute><UploadCv /></PaidRoute>} />
          {/* Both /profile and /profile-builder show ProfileBuilder */}
          <Route path="/profile-builder" element={<PaidRoute><ProfileBuilder /></PaidRoute>} />
          <Route path="/resume-maker" element={<PaidRoute><ResumeMaker /></PaidRoute>} />
          <Route path="/resumes" element={<PaidRoute><ResumeMaker /></PaidRoute>} />
          <Route path="/resume-builder/:resumeId/edit" element={<PaidRoute><ResumeMaker /></PaidRoute>} />
          <Route path="/dashboard/resume-builder" element={<Navigate to="/resumes" replace />} />
          <Route path="/dashboard/resume-builder/:resumeId/edit" element={<PaidRoute><ResumeMaker /></PaidRoute>} />
          <Route
            path="/free-tools"
            element={
              <ProtectedRoute>
                <FreeTierResumeTools />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/score-resume"
            element={
              <ProtectedRoute>
                <FreeTierResumeTools />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/bd/login" element={<BdLogin />} />
          <Route path="/bd/signup" element={<BdSignup />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/start" element={<Start />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <Billing />
              </ProtectedRoute>
            }
          />
          <Route path="/success" element={<CheckoutSuccess />} />
          <Route path="/checkout-success" element={<CheckoutSuccess />} />
          <Route path="/dashboard" element={<PaidRoute><Dashboard /></PaidRoute>} />
          <Route path="/dashboard/job-tracker" element={<PaidRoute><DashboardApplications /></PaidRoute>} />
          <Route path="/dashboard/applications" element={<Navigate to="/dashboard/job-tracker" replace />} />
          <Route path="/dashboard/mock-interviews" element={<PaidRoute><MockInterviewsIndex /></PaidRoute>} />
          <Route path="/dashboard/mock-interviews/:scenarioId/setup" element={<PaidRoute><MockInterviewSetup /></PaidRoute>} />
          <Route path="/dashboard/mock-interviews/session/:sessionId" element={<PaidRoute><MockInterviewSession /></PaidRoute>} />
          <Route path="/dashboard/mock-interviews/session/:sessionId/report" element={<PaidRoute><MockInterviewReport /></PaidRoute>} />
          <Route path="/dashboard/mock-interviews/history" element={<PaidRoute><MockInterviewHistory /></PaidRoute>} />
          <Route
            path="/dashboard/application-materials"
            element={
              <PaidRoute>
                <ApplicationMaterialsLayout />
              </PaidRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard/application-materials/documents" replace />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="linkedin" element={<LinkedInPage />} />
            <Route path="cover-letters" element={<CoverLettersPage />} />
          </Route>
          <Route path="/dashboard/job-preferences" element={<PaidRoute><Onboarding dashboardMode /></PaidRoute>} />
          <Route path="/dashboard/help" element={<PaidRoute><UserLeadHelp /></PaidRoute>} />
          <Route path="/dashboard/help/:leadId" element={<PaidRoute><UserLeadHelp /></PaidRoute>} />
          <Route path="/profile" element={<PaidRoute><ProfileBuilder /></PaidRoute>} />
          <Route path="/settings" element={<PaidRoute><Settings /></PaidRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboardOverview />} />
            <Route path="plans" element={<AdminPlans />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="leads" element={<AdminLeads />} />
            <Route path="bds" element={<AdminBds />} />
            <Route path="subscriptions" element={<AdminSubscriptions />} />
            <Route path="mock-interviews" element={<AdminMockInterviews />} />
            <Route path="mock-interviews/analytics" element={<AdminMockInterviewAnalytics />} />
          </Route>
          <Route path="/bd" element={<BdRoute><BdLayout /></BdRoute>}>
            <Route index element={<BdDashboardOverview />} />
            <Route path="create-lead" element={<BdCreateLead />} />
            <Route path="assigned-profiles" element={<BdAssignedProfiles />} />
            <Route path="leads" element={<BdYourLeads />} />
            <Route path="resumes" element={<BdResumes />} />
            <Route path="interview" element={<BdInterviewDetails />} />
            <Route path="help" element={<BdLeadHelp />} />
            <Route path="settings" element={<BdSettings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
