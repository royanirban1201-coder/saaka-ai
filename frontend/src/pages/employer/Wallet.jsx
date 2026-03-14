import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { employerAPI } from '../../services/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

export default function EmployerWallet() {
  const { user } = useAuthStore()
  const [balance, setBalance] = useState(0)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    employerAPI.getWallet().then(r => setBalance(r.data.balance||0)).catch(()=>{})
  }, [])

  const topup = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt < 100) { toast.error('Minimum top-up is ₹100'); return }
    setLoading(true)
    try {
      const keyRes = await fetch('/wallet/razorpay-key', {
        headers:{ Authorization:`Bearer ${localStorage.getItem('sakaa_token')}` }
      }).then(r=>r.json())
      const keyId = keyRes.key_id

      if (keyId && window.Razorpay) {
        const options = {
          key: keyId,
          amount: amt * 100,
          currency: 'INR',
          name: 'Sakaa-AI',
          description: 'Wallet top-up',
          theme: { color: '#6C63FF' },
          handler: async (response) => {
            try {
              await employerAPI.topupWallet({ amount:amt, payment_id:response.razorpay_payment_id })
              setBalance(b => b + amt)
              setAmount('')
              toast.success(`₹${amt.toLocaleString('en-IN')} added to wallet!`)
              useAuthStore.getState().setUser({...user, wallet_balance: (user?.wallet_balance||0)+amt})
            } catch { toast.error('Failed to update wallet') }
          },
        }
        new window.Razorpay(options).open()
      } else {
        // Dev mode — skip Razorpay
        await employerAPI.topupWallet({ amount:amt, payment_id:'test_skip' })
        setBalance(b => b + amt)
        setAmount('')
        toast.success(`₹${amt.toLocaleString('en-IN')} added (dev mode)`)
      }
    } catch (err) { toast.error(err.response?.data?.detail||'Top-up failed') }
    finally { setLoading(false) }
  }

  return (
    <Layout>
      <div className="animate-fadeUp" style={{ maxWidth:480 }}>
        <h1 style={{fontFamily:'var(--font-display)',fontSize:26,fontWeight:700,marginBottom:24}}>Wallet</h1>

        {/* Balance card */}
        <div style={{
          background:'linear-gradient(135deg,rgba(108,99,255,0.15),rgba(0,212,170,0.08))',
          border:'1px solid rgba(108,99,255,0.2)',
          borderRadius:20, padding:'32px', marginBottom:20, textAlign:'center',
        }}>
          <p style={{fontSize:12,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Available balance</p>
          <p style={{fontFamily:'var(--font-display)',fontSize:44,fontWeight:800,color:'var(--text1)'}}>
            ₹{balance.toLocaleString('en-IN')}
          </p>
          <p style={{fontSize:12,color:'var(--text3)',marginTop:8}}>Funds locked for active contracts are not shown here</p>
        </div>

        {/* Top-up */}
        <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:16,padding:'24px',marginBottom:20}}>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,marginBottom:16}}>Add funds</h2>
          <div style={{display:'flex',gap:10}}>
            <div style={{flex:1}}>
              <label className="label">Amount (₹)</label>
              <input type="number" className="input" placeholder="5000" value={amount} onChange={e=>setAmount(e.target.value)} min="100" />
            </div>
            <div style={{alignSelf:'flex-end'}}>
              <button onClick={topup} disabled={loading||!amount} className="btn-primary" style={{padding:'10px 20px'}}>
                {loading?'Processing...':'Top up'}
              </button>
            </div>
          </div>
          <div style={{display:'flex',gap:8,marginTop:10}}>
            {[500,1000,5000,10000].map(v=>(
              <button key={v} onClick={()=>setAmount(String(v))} style={{
                background:amount==v?'rgba(108,99,255,0.15)':'var(--bg3)',
                border:`1px solid ${amount==v?'rgba(108,99,255,0.3)':'var(--border)'}`,
                borderRadius:8, padding:'5px 10px', fontSize:12, color:amount==v?'var(--primary2)':'var(--text3)',
                cursor:'pointer', transition:'all 0.15s',
              }}>₹{v.toLocaleString('en-IN')}</button>
            ))}
          </div>
        </div>

        <div style={{background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:12,padding:'14px 16px'}}>
          <p style={{fontSize:12,color:'#FCD34D',lineHeight:1.6}}>
            ⚠ The full project amount (contract + platform fee + tax) is deducted from your wallet at contract start and held in escrow. Keep sufficient balance before creating contracts.
          </p>
        </div>
      </div>
    </Layout>
  )
}
