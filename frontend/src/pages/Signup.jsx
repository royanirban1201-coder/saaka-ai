import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

const DOMAINS = [
  'Web Development', 'Frontend Dev', 'Backend Dev', 'Full Stack Dev',
  'Mobile Dev (Android)', 'Mobile Dev (iOS)', 'Cross-platform (Flutter/RN)',
  'Game Development', 'DevOps / CI-CD', 'Cloud Architecture (AWS/GCP/Azure)',
  'Blockchain / Web3', 'Machine Learning', 'Deep Learning', 'NLP / LLMs',
  'Computer Vision', 'Data Science', 'UI / UX Design', 'Graphic Design',
  'Video Editing', 'Copywriting', 'Technical Writing', 'Content Writing',
  'Digital Marketing', 'SEO / SEM', 'Social Media Marketing',
  'Accounting / Bookkeeping', 'Legal Consulting', 'Project Management',
  'Online Tutoring', 'Voice Over', 'Architecture / CAD',
]

const COUNTRIES = [
  { code: '+91',  flag: '🇮🇳' },
  { code: '+1',   flag: '🇺🇸' },
  { code: '+44',  flag: '🇬🇧' },
  { code: '+61',  flag: '🇦🇺' },
  { code: '+971', flag: '🇦🇪' },
  { code: '+65',  flag: '🇸🇬' },
  { code: '+49',  flag: '🇩🇪' },
  { code: '+33',  flag: '🇫🇷' },
  { code: '+81',  flag: '🇯🇵' },
  { code: '+86',  flag: '🇨🇳' },
  { code: '+55',  flag: '🇧🇷' },
  { code: '+27',  flag: '🇿🇦' },
  { code: '+62',  flag: '🇮🇩' },
  { code: '+92',  flag: '🇵🇰' },
  { code: '+880', flag: '🇧🇩' },
  { code: '+977', flag: '🇳🇵' },
]

const DISCOVERY = ['Google', 'Instagram', 'LinkedIn', 'Friend referral', 'Hackathon', 'College', 'Other']

function PasswordStrength({ password }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Uppercase letter',       ok: /[A-Z]/.test(password) },
    { label: 'Number',                 ok: /[0-9]/.test(password) },
    { label: 'Special character',      ok: /[^A-Za-z0-9]/.test(password) },
  ]
  const score = checks.filter(c => c.ok).length
  const colors = ['', '#EF4444', '#F59E0B', '#F59E0B', '#10B981']
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  if (!password) return null
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6, alignItems: 'center' }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= score ? colors[score] : 'var(--bg3)',
            transition: 'background 0.3s'
          }} />
        ))}
        <span style={{ fontSize: 11, color: colors[score], marginLeft: 6, minWidth: 40 }}>
          {labels[score]}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {checks.map(c => (
          <span key={c.label} style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 10,
            background: c.ok ? 'rgba(16,185,129,0.1)' : 'var(--bg3)',
            color: c.ok ? '#10B981' : 'var(--text3)',
            border: `1px solid ${c.ok ? 'rgba(16,185,129,0.2)' : 'transparent'}`,
            transition: 'all 0.2s'
          }}>
            {c.ok ? '✓ ' : ''}{c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Signup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser } = useAuthStore()

  const roleFromUrl = searchParams.get('role') || ''
  const [step, setStep]     = useState(1)
  const [role, setRole]     = useState(roleFromUrl)
  const [loading, setLoading] = useState(false)

  const [s1, setS1] = useState({
    full_name: '', email: '', password: '',
    confirm_password: '', phone: '', country_code: '+91'
  })
  const [s2f, setS2f] = useState({
    domains: [], sub_skills: '', years_experience: 1,
    hourly_rate: 500, portfolio_links: '', linkedin: '',
    bio: '', languages: 'English', availability: 'full-time',
    min_budget: 5000, max_budget: 50000
  })
  const [s2e, setS2e] = useState({
    company_name: '', industry_type: '', gst_number: '',
    billing_address: '', payment_method: 'upi', website: '', team_size: ''
  })
  const [s3, setS3] = useState({
    account_holder: '', bank_name: '', account_number: '',
    ifsc: '', account_type: 'savings', upi_id: '', pan: '', gst: ''
  })
  const [discovery, setDiscovery] = useState('')

  const baseInp = {
    width: '100%', background: 'var(--bg3)',
    border: '1px solid var(--border)', borderRadius: 10,
    padding: '10px 14px', color: 'var(--text1)',
    fontFamily: 'var(--font)', fontSize: 14,
    outline: 'none', transition: 'border-color 0.2s',
  }
  const lbl = {
    display: 'block', fontSize: 11, fontWeight: 500,
    color: 'var(--text2)', marginBottom: 5, letterSpacing: '0.03em'
  }
  const onFocus = e => { e.target.style.borderColor = 'var(--primary)' }
  const onBlur  = e => { e.target.style.borderColor = 'var(--border)'  }

  const toggleDomain = d => {
    setS2f(p => ({
      ...p,
      domains: p.domains.includes(d)
        ? p.domains.filter(x => x !== d)
        : [...p.domains, d]
    }))
  }

  const step1Submit = async e => {
    e.preventDefault()
    if (!role) { toast.error('Please select a role'); return }
    if (s1.password !== s1.confirm_password) { toast.error('Passwords do not match'); return }
    if (s1.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (s1.phone.length < 8) { toast.error('Enter a valid phone number'); return }
    setLoading(true)
    try {
      const res = await authAPI.signupStep1({
        full_name: s1.full_name,
        email: s1.email,
        password: s1.password,
        phone: `${s1.country_code}${s1.phone}`,
        role
      })
      localStorage.setItem('sakaa_token', res.data.token)
      setUser(res.data.user)
      toast.success('Account created!')
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Signup failed')
    } finally { setLoading(false) }
  }

  const step2Submit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      if (role === 'freelancer') {
        await authAPI.freelancerProfile({
          ...s2f,
          sub_skills:      s2f.sub_skills.split(',').map(s => s.trim()).filter(Boolean),
          portfolio_links: s2f.portfolio_links.split(',').map(s => s.trim()).filter(Boolean),
          languages:       s2f.languages.split(',').map(s => s.trim()).filter(Boolean),
        })
        setStep(3)
      } else {
        await authAPI.employerProfile(s2e)
        setStep(4)
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save profile')
    } finally { setLoading(false) }
  }

  const step3Submit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.bankDetails(s3)
      toast.success('Bank details saved securely')
      setStep(4)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setLoading(false) }
  }

  const step4Submit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.interests({ domains_of_interest: [], discovery_source: discovery })
      toast.success('Welcome to Sakaa-AI!')
      navigate('/dashboard')
    } catch {
      navigate('/dashboard')
    } finally { setLoading(false) }
  }

  const stepLabel = () => {
    if (step === 1) return 'Create account'
    if (step === 2) return role === 'freelancer' ? 'Professional profile' : 'Company details'
    if (step === 3) return role === 'freelancer' ? 'Bank details' : 'How did you find us?'
    return 'How did you find us?'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(ellipse 70% 60% at 50% -20%, rgba(108,99,255,0.08) 0%, transparent 60%), var(--bg)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div className="animate-fadeUp" style={{ width: '100%', maxWidth: 500 }}>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg,#6C63FF,#00D4AA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'white',
            margin: '0 auto 10px',
          }}>S</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text1)' }}>
            Sakaa<span style={{ color: 'var(--primary)' }}>-AI</span>
          </h1>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: '28px 32px' }}>

          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            {[1,2,3,4].map(n => (
              <div key={n} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: step >= n ? 'var(--primary)' : 'var(--bg3)',
                transition: 'background 0.3s'
              }} />
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 22 }}>
            Step {step} of 4 — {stepLabel()}
          </p>

          {/* STEP 1 */}
          {step === 1 && (
            <form onSubmit={step1Submit}>
              {!roleFromUrl && (
                <div style={{ marginBottom: 20 }}>
                  <label style={lbl}>I am joining as</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {['employer', 'freelancer'].map(r => (
                      <button type="button" key={r} onClick={() => setRole(r)} style={{
                        padding: '12px', borderRadius: 10,
                        border: `1px solid ${role === r ? 'var(--primary)' : 'var(--border)'}`,
                        background: role === r ? 'rgba(108,99,255,0.1)' : 'transparent',
                        color: role === r ? 'var(--primary2)' : 'var(--text2)',
                        fontSize: 14, fontWeight: 500, cursor: 'pointer',
                        fontFamily: 'var(--font)', textTransform: 'capitalize', transition: 'all 0.2s'
                      }}>{r}</button>
                    ))}
                  </div>
                </div>
              )}

              {roleFromUrl && (
                <div style={{ marginBottom: 18, padding: '10px 14px', background: 'rgba(108,99,255,0.08)', borderRadius: 10, border: '1px solid rgba(108,99,255,0.2)' }}>
                  <p style={{ fontSize: 13, color: 'var(--primary2)', fontWeight: 500, textTransform: 'capitalize' }}>
                    Joining as {role}
                  </p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={lbl}>Full name</label>
                  <input style={baseInp} required placeholder="Anirban Roy"
                    value={s1.full_name}
                    onChange={e => setS1(p => ({ ...p, full_name: e.target.value }))}
                    onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={lbl}>Email address</label>
                  <input type="email" style={baseInp} required placeholder="you@example.com"
                    value={s1.email}
                    onChange={e => setS1(p => ({ ...p, email: e.target.value }))}
                    onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Phone number</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    value={s1.country_code}
                    onChange={e => setS1(p => ({ ...p, country_code: e.target.value }))}
                    style={{
                      width: 90, flexShrink: 0,
                      background: 'var(--bg3)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '10px 6px',
                      color: 'var(--text1)', fontFamily: 'var(--font)',
                      fontSize: 12, outline: 'none', cursor: 'pointer',
                    }}
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                    ))}
                  </select>
                  <input
                    style={{
                      ...baseInp, flex: 1,
                      borderColor: s1.phone.length > 3 && s1.phone.length < 8
                        ? '#EF4444'
                        : s1.phone.length >= 8 ? '#10B981' : 'var(--border)'
                    }}
                    required placeholder="9876543210"
                    value={s1.phone}
                    onChange={e => setS1(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                    onFocus={onFocus}
                    onBlur={e => {
                      if (s1.phone.length > 3 && s1.phone.length < 8) e.target.style.borderColor = '#EF4444'
                      else if (s1.phone.length >= 8) e.target.style.borderColor = '#10B981'
                      else e.target.style.borderColor = 'var(--border)'
                    }}
                  />
                </div>
                {s1.phone.length > 3 && s1.phone.length < 8 && (
                  <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>Enter a valid phone number</p>
                )}
                {s1.phone.length >= 8 && (
                  <p style={{ fontSize: 11, color: '#10B981', marginTop: 4 }}>✓ Valid number</p>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Password</label>
                <input type="password" style={baseInp} required placeholder="Min 8 characters"
                  value={s1.password}
                  onChange={e => setS1(p => ({ ...p, password: e.target.value }))}
                  onFocus={onFocus} onBlur={onBlur} />
                <PasswordStrength password={s1.password} />
              </div>

              <div style={{ marginBottom: 22 }}>
                <label style={lbl}>Confirm password</label>
                <input type="password" style={{
                  ...baseInp,
                  borderColor: s1.confirm_password
                    ? s1.confirm_password === s1.password ? '#10B981' : '#EF4444'
                    : 'var(--border)'
                }} required placeholder="Repeat your password"
                  value={s1.confirm_password}
                  onChange={e => setS1(p => ({ ...p, confirm_password: e.target.value }))}
                  onFocus={onFocus} onBlur={onBlur} />
                {s1.confirm_password && s1.confirm_password !== s1.password && (
                  <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>Passwords do not match</p>
                )}
                {s1.confirm_password && s1.confirm_password === s1.password && (
                  <p style={{ fontSize: 11, color: '#10B981', marginTop: 4 }}>✓ Passwords match</p>
                )}
              </div>

              <button type="submit" disabled={loading || !role} className="btn-primary"
                style={{ width: '100%', padding: 12, fontSize: 14, borderRadius: 12 }}>
                {loading ? 'Creating account...' : 'Continue →'}
              </button>

              <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text3)' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: 'var(--primary2)', textDecoration: 'none', fontWeight: 500 }}>
                  Sign in
                </Link>
              </p>
            </form>
          )}

          {/* STEP 2 FREELANCER */}
          {step === 2 && role === 'freelancer' && (
            <form onSubmit={step2Submit}>
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Select your domains (pick all that apply)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, maxHeight: 160, overflowY: 'auto', padding: '4px 0' }}>
                  {DOMAINS.map(d => (
                    <button type="button" key={d} onClick={() => toggleDomain(d)} style={{
                      padding: '5px 10px', borderRadius: 20, fontSize: 11,
                      border: `1px solid ${s2f.domains.includes(d) ? 'var(--primary)' : 'var(--border)'}`,
                      background: s2f.domains.includes(d) ? 'rgba(108,99,255,0.15)' : 'var(--bg3)',
                      color: s2f.domains.includes(d) ? 'var(--primary2)' : 'var(--text3)',
                      cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font)',
                    }}>{d}</button>
                  ))}
                </div>
                {s2f.domains.length > 0 && (
                  <p style={{ fontSize: 11, color: 'var(--primary2)', marginTop: 6 }}>
                    ✓ {s2f.domains.length} domain{s2f.domains.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={lbl}>Sub-skills (comma separated)</label>
                  <input style={baseInp} placeholder="React, Node.js, Figma"
                    value={s2f.sub_skills}
                    onChange={e => setS2f(p => ({ ...p, sub_skills: e.target.value }))}
                    onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={lbl}>Years of experience</label>
                  <input type="number" style={baseInp} min="0"
                    value={s2f.years_experience}
                    onChange={e => setS2f(p => ({ ...p, years_experience: +e.target.value }))}
                    onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={lbl}>Hourly rate (₹)</label>
                  <input type="number" style={baseInp}
                    value={s2f.hourly_rate}
                    onChange={e => setS2f(p => ({ ...p, hourly_rate: +e.target.value }))}
                    onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={lbl}>Availability</label>
                  <select style={baseInp} value={s2f.availability}
                    onChange={e => setS2f(p => ({ ...p, availability: e.target.value }))}>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Portfolio links (GitHub, Behance, Dribbble...)</label>
                <input style={baseInp} placeholder="github.com/you, behance.net/you"
                  value={s2f.portfolio_links}
                  onChange={e => setS2f(p => ({ ...p, portfolio_links: e.target.value }))}
                  onFocus={onFocus} onBlur={onBlur} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>LinkedIn (optional)</label>
                <input style={baseInp} placeholder="linkedin.com/in/yourname"
                  value={s2f.linkedin}
                  onChange={e => setS2f(p => ({ ...p, linkedin: e.target.value }))}
                  onFocus={onFocus} onBlur={onBlur} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Bio / headline</label>
                <textarea style={{ ...baseInp, minHeight: 72, resize: 'vertical' }}
                  placeholder="Full stack developer with 3 years experience building scalable web apps..."
                  value={s2f.bio}
                  onChange={e => setS2f(p => ({ ...p, bio: e.target.value }))}
                  onFocus={onFocus} onBlur={onBlur} />
              </div>

              <button type="submit" disabled={loading || s2f.domains.length === 0}
                className="btn-primary" style={{ width: '100%', padding: 12, fontSize: 14, borderRadius: 12 }}>
                {loading ? 'Saving...' : 'Continue →'}
              </button>
            </form>
          )}

          {/* STEP 2 EMPLOYER */}
          {step === 2 && role === 'employer' && (
            <form onSubmit={step2Submit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={lbl}>Company / individual name</label>
                  <input style={baseInp} required value={s2e.company_name}
                    onChange={e => setS2e(p => ({ ...p, company_name: e.target.value }))}
                    onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={lbl}>Industry type</label>
                  <input style={baseInp} placeholder="Technology, Finance..."
                    value={s2e.industry_type}
                    onChange={e => setS2e(p => ({ ...p, industry_type: e.target.value }))}
                    onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={lbl}>GST number (optional)</label>
                  <input style={baseInp} value={s2e.gst_number}
                    onChange={e => setS2e(p => ({ ...p, gst_number: e.target.value }))}
                    onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={lbl}>Payment method</label>
                  <select style={baseInp} value={s2e.payment_method}
                    onChange={e => setS2e(p => ({ ...p, payment_method: e.target.value }))}>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="netbanking">Net Banking</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Billing address</label>
                <textarea style={{ ...baseInp, minHeight: 60, resize: 'vertical' }}
                  value={s2e.billing_address}
                  onChange={e => setS2e(p => ({ ...p, billing_address: e.target.value }))}
                  onFocus={onFocus} onBlur={onBlur} />
              </div>
              <button type="submit" disabled={loading}
                className="btn-primary" style={{ width: '100%', padding: 12, fontSize: 14, borderRadius: 12 }}>
                {loading ? 'Saving...' : 'Continue →'}
              </button>
            </form>
          )}

          {/* STEP 3 FREELANCER — Bank details */}
          {step === 3 && role === 'freelancer' && (
            <form onSubmit={step3Submit}>
              <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, marginBottom: 18 }}>
                <p style={{ fontSize: 12, color: '#10B981' }}>
                  🔒 AES-256 encrypted · Stored separately · Never exposed in API responses
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  ['Account holder name', 'account_holder'],
                  ['Bank name',           'bank_name'],
                  ['Account number',      'account_number'],
                  ['IFSC code',           'ifsc'],
                  ['UPI ID',              'upi_id'],
                  ['PAN number',          'pan'],
                ].map(([label, key]) => (
                  <div key={key}>
                    <label style={lbl}>{label}</label>
                    <input style={baseInp} value={s3[key]}
                      onChange={e => setS3(p => ({ ...p, [key]: e.target.value }))}
                      onFocus={onFocus} onBlur={onBlur} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setStep(4)}
                  className="btn-ghost" style={{ flex: 1, padding: 12, fontSize: 13 }}>
                  Skip for now
                </button>
                <button type="submit" disabled={loading}
                  className="btn-primary" style={{ flex: 1, padding: 12, fontSize: 13 }}>
                  {loading ? 'Saving...' : 'Save securely'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4 — Discovery */}
          {step === 4 && (
            <form onSubmit={step4Submit}>
              <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.6 }}>
                How did you hear about Sakaa-AI?
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
                {DISCOVERY.map(d => (
                  <button type="button" key={d} onClick={() => setDiscovery(d)} style={{
                    padding: '14px 8px', borderRadius: 12, fontSize: 13,
                    border: `1px solid ${discovery === d ? 'var(--primary)' : 'var(--border)'}`,
                    background: discovery === d ? 'rgba(108,99,255,0.12)' : 'var(--bg3)',
                    color: discovery === d ? 'var(--primary2)' : 'var(--text2)',
                    cursor: 'pointer', transition: 'all 0.15s',
                    fontFamily: 'var(--font)', textAlign: 'center',
                  }}>{d}</button>
                ))}
              </div>
              <button type="submit" disabled={loading}
                className="btn-primary" style={{ width: '100%', padding: 12, fontSize: 14, borderRadius: 12 }}>
                {loading ? 'Setting up your account...' : 'Enter Sakaa-AI →'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}