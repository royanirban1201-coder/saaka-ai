import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sakaa_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sakaa_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────
export const authAPI = {
  signupStep1:        (data) => api.post('/auth/signup/step1', data),
  freelancerProfile:  (data) => api.post('/auth/signup/freelancer-profile', data),
  bankDetails:        (data) => api.post('/auth/signup/bank-details', data),
  employerProfile:    (data) => api.post('/auth/signup/employer-profile', data),
  interests:          (data) => api.post('/auth/signup/interests', data),
  login:              (data) => api.post('/auth/login', data),
  googleLogin:        (data) => api.post('/auth/google-login', data),
  me:                 ()     => api.get('/auth/me'),
  changePassword:     (data) => api.post('/auth/change-password', data),
  forgotPassword:     (email)=> api.post(`/auth/forgot-password?email=${email}`),
  resetPassword:      (d)    => api.post(`/auth/reset-password?email=${d.email}&otp=${d.otp}&new_password=${d.new_password}`),
}

// ── Employer ──────────────────────────────────────────
export const employerAPI = {
  explore:            (params) => api.get('/employer/explore', { params }),
  getFreelancer:      (id)     => api.get(`/employer/freelancer/${id}`),
  sendOffers:         (data)   => api.post('/employer/send-offers', data),
  createTender:       (data)   => api.post('/employer/tender', data),
  tenderApplicants:   (id)     => api.get(`/employer/tender/${id}/applicants`),
  selectWinner:       (tid, fid, price) => api.post(`/employer/tender/${tid}/select/${fid}?agreed_price=${price}`),
  getContracts:       ()       => api.get('/employer/contracts'),
  getWallet:          ()       => api.get('/employer/wallet'),
  topupWallet:        (data)   => api.post('/wallet/topup', data),

}

// ── Freelancer ────────────────────────────────────────
export const freelancerAPI = {
  getOffers:          ()       => api.get('/freelancer/offers'),
  acceptOffer:        (id)     => api.post(`/freelancer/offers/${id}/accept`),
  rejectOffer:        (id)     => api.post(`/freelancer/offers/${id}/reject`),
  browseTenders:      ()       => api.get('/freelancer/tenders'),
  applyTender:        (id, p)  => api.post(`/freelancer/tenders/${id}/apply?proposed_price=${p}`),
  getContracts:       ()       => api.get('/freelancer/contracts'),
  submitMilestone:    (data)   => api.post('/freelancer/milestones/submit', data),
  reviewMilestone:    (data)   => api.post('/freelancer/milestones/review', data),
  setAvailability:    (v)      => api.post('/freelancer/availability', { available: v }),
  getWallet:          ()       => api.get('/wallet/summary'),
  transferToBank:     (cid)    => api.post('/wallet/transfer', { contract_id: cid }),
  addPortfolioProject: (data) => api.post('/freelancer/portfolio/project', null, { params: data }),
  getPortfolio:        ()     => api.get('/freelancer/portfolio'),
  updatePhoto:         (url)  => api.post(`/freelancer/profile/photo?photo_url=${encodeURIComponent(url)}`),
}

// ── AI Agent ──────────────────────────────────────────
export const aiAPI = {
  chat:               (data)   => api.post('/ai/chat', data),
  generateMilestones: (pid)    => api.post(`/ai/projects/${pid}/generate-milestones`),
  workCheck:          (data)   => api.post('/ai/work-assignment', data),
  portfolioSummary:   (fid)    => api.get(`/ai/portfolio-summary/${fid}`),
  checkNegotiation:   (cid)    => api.post(`/ai/check-negotiation/${cid}`),
  pfiHistory:         ()       => api.get('/ai/pfi/history'),
  getChatHistory: (projectId) => api.get(`/ai/chat/history/${projectId}`),
}

// ── Negotiation ───────────────────────────────────────
export const negotiationAPI = {
  sendMessage:        (data)   => api.post('/negotiation/message', data),
  getMessages:        (cid)    => api.get(`/negotiation/messages/${cid}`),
}

// ── Admin ─────────────────────────────────────────────
export const adminAPI = {
  dashboard:          ()       => api.get('/admin/dashboard'),
  users:              (role)   => api.get('/admin/users', { params: { role } }),
  banUser:            (id, r)  => api.post(`/admin/ban/${id}?reason=${r}`),
  approveKyc:         (id)     => api.post(`/admin/kyc/approve/${id}`),
  overridePfi:        (data)   => api.post('/admin/pfi/override', data),
  disputes:           ()       => api.get('/admin/disputes'),
  resolveDispute:     (data)   => api.post('/admin/disputes/resolve', data),
  refundContract:     (cid)    => api.post(`/admin/contracts/${cid}/refund`),
}

export default api
