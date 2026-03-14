// ForgotPassword
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPw, setNewPw] = useState('')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"

  const sendOtp = async (e) => {
    e.preventDefault(); setLoading(true)
    try { await authAPI.forgotPassword(email); toast.success('OTP sent'); setStep(2) }
    catch { toast.error('Failed') } finally { setLoading(false) }
  }

  const resetPw = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      await authAPI.resetPassword({ email, otp, new_password: newPw })
      toast.success('Password reset! Please login.')
      setStep(3)
    } catch { toast.error('Invalid OTP or expired') } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-md">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Reset password</h1>
        <p className="text-gray-500 text-sm mb-6">We'll send an OTP to your email</p>
        {step === 1 && (
          <form onSubmit={sendOtp} className="space-y-4">
            <div><label className="text-sm text-gray-700 mb-1 block">Email</label>
              <input type="email" className={inp} value={email} onChange={e=>setEmail(e.target.value)} /></div>
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50">{loading?'Sending...':'Send OTP'}</button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={resetPw} className="space-y-4">
            <div><label className="text-sm text-gray-700 mb-1 block">OTP (check your email)</label>
              <input className={inp} value={otp} onChange={e=>setOtp(e.target.value)} placeholder="6-digit code" /></div>
            <div><label className="text-sm text-gray-700 mb-1 block">New password</label>
              <input type="password" className={inp} value={newPw} onChange={e=>setNewPw(e.target.value)} /></div>
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50">{loading?'Resetting...':'Reset password'}</button>
          </form>
        )}
        {step === 3 && (
          <div className="text-center"><p className="text-green-600 mb-4">Password reset successfully!</p>
            <Link to="/login" className="text-indigo-600 font-medium hover:underline">Go to login</Link></div>
        )}
        <p className="mt-4 text-center text-sm text-gray-500">
          <Link to="/login" className="text-indigo-600 hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  )
}
