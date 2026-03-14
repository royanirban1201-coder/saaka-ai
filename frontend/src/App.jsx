import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'

// Pages
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'

import EmployerDashboard from './pages/employer/Dashboard'
import EmployerExplore from './pages/employer/Explore'
import EmployerHire from './pages/employer/Hire'
import EmployerContracts from './pages/employer/Contracts'
import EmployerWallet from './pages/employer/Wallet'
import FreelancerProfile from './pages/employer/FreelancerProfile'
import TenderFloat from './pages/employer/TenderFloat'

import FreelancerDashboard from './pages/freelancer/Dashboard'
import FreelancerOffers from './pages/freelancer/Offers'
import FreelancerTenders from './pages/freelancer/Tenders'
import FreelancerContracts from './pages/freelancer/Contracts'
import FreelancerWallet from './pages/freelancer/Wallet'
import PFIHistory from './pages/freelancer/PFIHistory'

import ContractDetail from './pages/shared/ContractDetail'
import NegotiationRoom from './pages/shared/NegotiationRoom'
import Settings from './pages/shared/Settings'

import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminDisputes from './pages/admin/Disputes'

// Protected route wrapper
function ProtectedRoute({ children, roles }) {
  const { user, token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}

function DashboardRedirect() {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'employer') return <Navigate to="/employer/dashboard" replace />
  if (user.role === 'freelancer') return <Navigate to="/freelancer/dashboard" replace />
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />
  return <Navigate to="/login" replace />
}

export default function App() {
  const { token, fetchMe } = useAuthStore()

  useEffect(() => {
    if (token) fetchMe()
  }, [token])

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />

        {/* Employer */}
        <Route path="/employer/dashboard" element={<ProtectedRoute roles={['employer','admin']}><EmployerDashboard /></ProtectedRoute>} />
        <Route path="/employer/explore" element={<ProtectedRoute roles={['employer','admin']}><EmployerExplore /></ProtectedRoute>} />
        <Route path="/employer/hire" element={<ProtectedRoute roles={['employer','admin']}><EmployerHire /></ProtectedRoute>} />
        <Route path="/employer/contracts" element={<ProtectedRoute roles={['employer','admin']}><EmployerContracts /></ProtectedRoute>} />
        <Route path="/employer/wallet" element={<ProtectedRoute roles={['employer','admin']}><EmployerWallet /></ProtectedRoute>} />
        <Route path="/employer/freelancer/:id" element={<ProtectedRoute roles={['employer','admin']}><FreelancerProfile /></ProtectedRoute>} />
        <Route path="/employer/tender" element={<ProtectedRoute roles={['employer','admin']}><TenderFloat /></ProtectedRoute>} />

        {/* Freelancer */}
        <Route path="/freelancer/dashboard" element={<ProtectedRoute roles={['freelancer','admin']}><FreelancerDashboard /></ProtectedRoute>} />
        <Route path="/freelancer/offers" element={<ProtectedRoute roles={['freelancer','admin']}><FreelancerOffers /></ProtectedRoute>} />
        <Route path="/freelancer/tenders" element={<ProtectedRoute roles={['freelancer','admin']}><FreelancerTenders /></ProtectedRoute>} />
        <Route path="/freelancer/contracts" element={<ProtectedRoute roles={['freelancer','admin']}><FreelancerContracts /></ProtectedRoute>} />
        <Route path="/freelancer/wallet" element={<ProtectedRoute roles={['freelancer','admin']}><FreelancerWallet /></ProtectedRoute>} />
        <Route path="/freelancer/pfi" element={<ProtectedRoute roles={['freelancer','admin']}><PFIHistory /></ProtectedRoute>} />

        {/* Shared */}
        <Route path="/contract/:id" element={<ProtectedRoute><ContractDetail /></ProtectedRoute>} />
        <Route path="/negotiation/:id" element={<ProtectedRoute><NegotiationRoom /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin/dashboard" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/disputes" element={<ProtectedRoute roles={['admin']}><AdminDisputes /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
