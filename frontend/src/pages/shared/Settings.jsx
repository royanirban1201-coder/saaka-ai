import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { authAPI, freelancerAPI } from '../../services/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

function Section({ title, desc, children, accent }) {
  return (
    <div style={{
      background: 'var(--card)', border: `1px solid ${accent ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
      borderRadius: 16, padding: '24px', marginBottom: 14,
    }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: accent ? '#EF4444' : 'var(--text1)', marginBottom: 4 }}>{title}</h2>
      {desc && <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 18 }}>{desc}</p>}
      {!desc && <div style={{ marginBottom: 16 }} />}
      {children}
    </div>
  )
}

const inp = {
  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '10px 14px', color: 'var(--text1)',
  fontFamily: 'var(--font)', fontSize: 14, outline: 'none', transition: 'border-color 0.2s',
}
const lbl = { display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 }

export default function Settings() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('profile')
  const [pw, setPw] = useState({ old_password: '', new_password: '', confirm: '' })
  const [available, setAvailable] = useState(user?.available ?? true)
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState({ old: false, new: false, confirm: false })

  const navItems = [
    { id: 'profile', label: 'View Profile', icon: '◎' },
    { id: 'security', label: 'Security', icon: '◈' },
    { id: 'bank', label: 'Bank Details', icon: '◆' },
    { id: 'notifications', label: 'Notifications', icon: '⬡' },
    { id: 'privacy', label: 'Privacy', icon: '✦' },
    { id: 'danger', label: 'Account', icon: '→' },
  ]

  const changePw = async e => {
    e.preventDefault()
    if (pw.new_password !== pw.confirm) { toast.error('Passwords do not match'); return }
    if (pw.new_password.length < 8) { toast.error('Minimum 8 characters'); return }
    setLoading(true)
    try {
      await authAPI.changePassword({ old_password: pw.old_password, new_password: pw.new_password })
      toast.success('Password changed successfully!')
      setPw({ old_password: '', new_password: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed — check your current password')
    } finally { setLoading(false) }
  }

  const toggleAvail = async () => {
    const v = !available
    setAvailable(v)
    try {
      await freelancerAPI.setAvailability(v)
      useAuthStore.getState().setUser({ ...user, available: v })
      toast.success(v ? '✓ Open to work' : 'Set as busy')
    } catch { setAvailable(!v); toast.error('Update failed') }
  }

  const pfi = user?.pfi_score || 70
  const pfiColor = pfi >= 80 ? '#10B981' : pfi >= 60 ? '#F59E0B' : '#EF4444'

  return (
    <Layout>
      <div className="animate-fadeUp">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, marginBottom: 24 }}>Settings</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, alignItems: 'start' }}>

          {/* Sidebar nav */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 12, position: 'sticky', top: 20 }}>
            {navItems.map(({ id, label, icon }) => (
              <button key={id} onClick={() => setActiveSection(id)} style={{
                width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 10,
                marginBottom: 2, fontSize: 13, fontWeight: activeSection === id ? 500 : 400,
                color: activeSection === id ? 'var(--primary2)' : 'var(--text2)',
                background: activeSection === id ? 'rgba(108,99,255,0.1)' : 'transparent',
                border: `1px solid ${activeSection === id ? 'rgba(108,99,255,0.2)' : 'transparent'}`,
                cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 11, opacity: 0.7 }}>{icon}</span> {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div>

            {/* Profile */}
            {activeSection === 'profile' && (
              <Section title="Your Profile" desc="Account information and public profile">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: '16px', background: 'var(--bg3)', borderRadius: 12 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontWeight: 700, color: 'white', flexShrink: 0,
                  }}>{user?.full_name?.[0]?.toUpperCase()}</div>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text1)' }}>{user?.full_name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, textTransform: 'capitalize' }}>{user?.role} · {user?.email}</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    ['Full name', user?.full_name],
                    ['Email', user?.email],
                    ['Phone', user?.phone || '—'],
                    ['Role', user?.role],
                    ['Member since', user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN') : '—'],
                    ['KYC Status', user?.kyc_verified ? '✓ Verified' : '⏳ Pending'],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <p style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{l}</p>
                      <p style={{ fontSize: 14, color: 'var(--text1)', fontWeight: 500 }}>{v}</p>
                    </div>
                  ))}
                </div>

                {user?.role === 'freelancer' && (
                  <div style={{ marginTop: 20, padding: '16px', background: 'var(--bg3)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text1)' }}>PFI Score</span>
                      <span style={{ fontSize: 22, fontWeight: 700, color: pfiColor }}>{pfi.toFixed(1)}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pfi}%`, background: `linear-gradient(90deg, ${pfiColor}, ${pfiColor}88)` }} />
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                      {pfi >= 80 ? 'Excellent — eligible for premium projects' : pfi >= 60 ? 'Good — complete more projects to improve' : 'Building — complete your first project'}
                    </p>
                  </div>
                )}
              </Section>
            )}

            {/* Security */}
            {activeSection === 'security' && (
              <Section title="Security" desc="Manage your password and account access">
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 16 }}>Change Password</h3>
                <form onSubmit={changePw} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    ['Current password', 'old_password', 'old'],
                    ['New password', 'new_password', 'new'],
                    ['Confirm new password', 'confirm', 'confirm'],
                  ].map(([label, key, showKey]) => (
                    <div key={key}>
                      <label style={lbl}>{label}</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPw[showKey] ? 'text' : 'password'}
                          style={{ ...inp, paddingRight: 40 }}
                          value={pw[key]}
                          onChange={e => setPw(p => ({ ...p, [key]: e.target.value }))}
                          onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                          onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        />
                        <button type="button" onClick={() => setShowPw(p => ({ ...p, [showKey]: !p[showKey] }))} style={{
                          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 12,
                        }}>{showPw[showKey] ? 'hide' : 'show'}</button>
                      </div>
                    </div>
                  ))}
                  <button type="submit" disabled={loading} className="btn-primary" style={{ width: 'fit-content', padding: '9px 20px', fontSize: 13, borderRadius: 10 }}>
                    {loading ? 'Updating...' : 'Update password'}
                  </button>
                </form>

                <div style={{ height: 1, background: 'var(--border)', margin: '24px 0' }} />

                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 12 }}>Two-Factor Authentication</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 13, color: 'var(--text2)' }}>Google Authenticator (TOTP)</p>
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Add an extra layer of security to your account</p>
                  </div>
                  <span className="badge badge-warn">Coming soon</span>
                </div>
              </Section>
            )}

            {/* Bank details */}
            {activeSection === 'bank' && (
              <Section title="Bank & Payout Details" desc="Securely stored with AES-256 encryption. Only used at payout.">
                <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, marginBottom: 20 }}>
                  <p style={{ fontSize: 12, color: '#10B981' }}>🔒 Encrypted at rest · Never returned in API · Decrypted only on payout trigger</p>
                </div>
                {user?.kyc_verified
                  ? <p style={{ fontSize: 13, color: '#10B981' }}>✓ KYC verified — bank details on file</p>
                  : <p style={{ fontSize: 13, color: '#F59E0B' }}>⏳ Bank details not verified yet. Go to signup step 3 to add them.</p>
                }
                <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>
                  For security, bank details can only be set during signup or updated through our KYC verification flow.
                  Contact support to update your bank details.
                </p>
              </Section>
            )}

            {/* Availability */}
            {activeSection === 'notifications' && (
              <Section title="Availability & Notifications" desc="Control your visibility and communication preferences">
                {user?.role === 'freelancer' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: 'var(--bg3)', borderRadius: 12, marginBottom: 16 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text1)' }}>Open to work</p>
                      <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>When off, hidden from employer searches and no new offers sent</p>
                    </div>
                    <div className={`toggle-track ${available ? 'on' : ''}`} onClick={toggleAvail}>
                      <div className="toggle-thumb" />
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {['Email notifications', 'In-app notifications', 'SMS alerts (milestones)'].map(n => (
                    <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg3)', borderRadius: 10 }}>
                      <span style={{ fontSize: 13, color: 'var(--text2)' }}>{n}</span>
                      <span className="badge badge-warn">Soon</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Privacy */}
            {activeSection === 'privacy' && (
              <Section title="Privacy" desc="How your data is used and who can see it">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    ['Profile visibility', 'Visible to employers matching your domains', true],
                    ['PFI Score', 'Displayed publicly on your profile', true],
                    ['Bank details', 'AES-256 encrypted, never exposed in any API response', true],
                    ['Chat messages', 'Stored for dispute resolution only', true],
                    ['Project history', 'Used to calculate PFI score', true],
                  ].map(([title, desc, on]) => (
                    <div key={title} style={{ padding: '12px 14px', background: 'var(--bg3)', borderRadius: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text1)' }}>{title}</span>
                        <span className={`badge ${on ? 'badge-success' : 'badge-warn'}`}>{on ? 'Active' : 'Off'}</span>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{desc}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Danger */}
            {activeSection === 'danger' && (
              <Section title="Account Actions" accent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ padding: '14px', background: 'var(--bg3)', borderRadius: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text1)', marginBottom: 4 }}>Sign out of all devices</p>
                    <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>This will invalidate all active sessions</p>
                    <button onClick={logout} style={{
                      background: 'transparent', border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 9, padding: '8px 18px', fontSize: 13, color: '#EF4444',
                      cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >Sign out</button>
                  </div>
                  <div style={{ padding: '14px', background: 'var(--bg3)', borderRadius: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text1)', marginBottom: 4 }}>Delete account</p>
                    <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>Permanently delete your account and all data. This cannot be undone.</p>
                    <button style={{
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 9, padding: '8px 18px', fontSize: 13, color: '#EF4444',
                      cursor: 'pointer', fontFamily: 'var(--font)',
                    }}>Request deletion</button>
                  </div>
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}