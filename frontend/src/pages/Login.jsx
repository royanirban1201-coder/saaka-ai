import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { authAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [form, setForm] = useState({ email:'', password:'' })
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid email or password')
    } finally { setLoading(false) }
  }

  const handleGoogle = async (credential) => {
    try {
      const res = await authAPI.googleLogin({ token: credential.credential })
      localStorage.setItem('sakaa_token', res.data.token)
      useAuthStore.getState().setUser(res.data.user)
      toast.success('Logged in with Google!')
      if (res.data.new_user) navigate('/signup?step=2')
      else navigate('/dashboard')
    } catch { toast.error('Google login failed') }
  }

  return (
    <div style={{
      minHeight:'100vh', background:'var(--bg)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:24,
      background:`
        radial-gradient(ellipse 70% 60% at 50% -20%, rgba(108,99,255,0.1) 0%, transparent 60%),
        var(--bg)
      `,
    }}>
      <div className="animate-fadeUp" style={{ width:'100%', maxWidth:420 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{
            width:48, height:48, borderRadius:14,
            background:'linear-gradient(135deg,#6C63FF,#00D4AA)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color:'white',
            margin:'0 auto 12px',
          }}>S</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700 }}>
            Sakaa<span style={{color:'var(--primary)'}}>-AI</span>
          </h1>
          <p style={{ color:'var(--text3)', fontSize:13, marginTop:4 }}>Sign in to your account</p>
        </div>

        {/* Card */}
        <div style={{
          background:'var(--card)', border:'1px solid var(--border)',
          borderRadius:20, padding:'32px',
        }}>
          {/* Google login */}
          <div style={{ marginBottom:20 }}>
            <GoogleLogin
              onSuccess={handleGoogle}
              onError={() => toast.error('Google login failed')}
              theme="filled_black"
              shape="pill"
              size="large"
              width="100%"
              text="continue_with"
            />
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0' }}>
            <div style={{ flex:1, height:1, background:'var(--border)' }} />
            <span style={{ fontSize:12, color:'var(--text3)' }}>or continue with email</span>
            <div style={{ flex:1, height:1, background:'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:16 }}>
              <label className="label">Email address</label>
              <input type="email" className="input" required placeholder="you@example.com"
                value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} />
            </div>
            <div style={{ marginBottom:8 }}>
              <label className="label">Password</label>
              <div style={{ position:'relative' }}>
                <input type={showPw?'text':'password'} className="input" required placeholder="••••••••"
                  value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))}
                  style={{ paddingRight:40 }} />
                <button type="button" onClick={()=>setShowPw(p=>!p)} style={{
                  position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', fontSize:14, color:'var(--text3)',
                }}>{showPw ? '◎' : '●'}</button>
              </div>
            </div>
            <div style={{ textAlign:'right', marginBottom:20 }}>
              <Link to="/forgot-password" style={{ fontSize:12, color:'var(--primary2)', textDecoration:'none' }}>
                Forgot password?
              </Link>
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ width:'100%', padding:12, fontSize:14, borderRadius:12 }}>
              {loading ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><span className="loader" style={{width:16,height:16}} />Signing in...</span> : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'var(--text3)' }}>
          No account?{' '}
          <Link to="/signup" style={{ color:'var(--primary2)', fontWeight:500, textDecoration:'none' }}>
            Create one →
          </Link>
        </p>
      </div>
    </div>
  )
}
