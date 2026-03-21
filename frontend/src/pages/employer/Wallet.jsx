import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { employerAPI } from '../../services/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

export default function EmployerWallet() {
  const { user } = useAuthStore()
  const [balance, setBalance] = useState(0)
  const [amount, setAmount]   = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    employerAPI.getWallet().then(r => setBalance(r.data.balance || 0)).catch(() => {})
  }, [])

  const topup = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt < 100) { toast.error('Minimum top-up is ₹100'); return }
    setLoading(true)
    try {
      await employerAPI.topupWallet({ amount: amt, payment_id: 'dev_skip' })
      setBalance(b => b + amt)
      setAmount('')
      useAuthStore.getState().setUser({ ...user, wallet_balance: (user?.wallet_balance || 0) + amt })
      toast.success(`₹${amt.toLocaleString('en-IN')} added to wallet!`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Top-up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="animate-page-enter" style={{ maxWidth: 500 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 28 }}>
          Wallet
        </h1>

        {/* Balance card */}
        <div style={{
          background: 'linear-gradient(135deg,rgba(108,99,255,0.18),rgba(0,212,170,0.1))',
          border: '1px solid rgba(108,99,255,0.25)', borderRadius: 22, padding: '36px',
          marginBottom: 20, textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -40, right: -40, width: 200, height: 200,
            borderRadius: '50%', background: 'radial-gradient(circle,rgba(108,99,255,0.12),transparent 70%)',
            pointerEvents: 'none'
          }} />
          <p style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>
            Available balance
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 48, fontWeight: 800, color: 'var(--text1)', textShadow: '0 0 40px rgba(108,99,255,0.3)' }}>
            ₹{balance.toLocaleString('en-IN')}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 10 }}>
            Funds locked for active contracts are separate
          </p>
        </div>

        {/* Top-up form */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: '24px', marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Add funds</h2>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 18 }}>
            Demo mode — funds added directly. Wire Razorpay for production.
          </p>

          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 5, display: 'block', fontFamily: 'var(--font-mono)' }}>
                Amount (₹)
              </label>
              <input
                type="number"
                className="input"
                placeholder="Enter amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="100"
                onKeyDown={e => e.key === 'Enter' && topup()}
              />
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <button onClick={topup} disabled={loading || !amount} className="btn-primary" style={{ padding: '10px 24px', fontSize: 14 }}>
                {loading ? 'Adding...' : 'Add funds'}
              </button>
            </div>
          </div>

          {/* Quick amounts */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[500, 1000, 5000, 10000, 25000].map(v => (
              <button key={v} onClick={() => setAmount(String(v))} style={{
                padding: '6px 14px', borderRadius: 10, fontSize: 13,
                background: +amount === v ? 'rgba(108,99,255,0.15)' : 'var(--bg3)',
                border: `1px solid ${+amount === v ? 'rgba(108,99,255,0.4)' : 'var(--border)'}`,
                color: +amount === v ? 'var(--primary2)' : 'var(--text3)',
                cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-mono)',
                boxShadow: +amount === v ? '0 0 10px rgba(108,99,255,0.2)' : 'none',
              }}>
                ₹{v.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
        </div>

        {/* Info box */}
        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ fontSize: 13, color: '#FCD34D', lineHeight: 1.7 }}>
            ⚠ The full project amount (contract + platform fee + tax) is deducted from your wallet when sending offers. Add enough balance before posting a project.
          </p>
        </div>
      </div>
    </Layout>
  )
}