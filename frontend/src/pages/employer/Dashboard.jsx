import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { employerAPI } from '../../services/api'
import useAuthStore from '../../store/authStore'

function StatCard({ label, value, sub, color, onClick }) {
  return (
    <div onClick={onClick} style={{
      background:'var(--card)', border:'1px solid var(--border)',
      borderRadius:16, padding:20, cursor: onClick ? 'pointer' : 'default',
      transition:'all 0.2s',
    }}
    onMouseEnter={e=>{ if(onClick){e.currentTarget.style.borderColor='var(--border2)'; e.currentTarget.style.transform='translateY(-2px)'} }}
    onMouseLeave={e=>{ if(onClick){e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='translateY(0)'} }}
    >
      <p style={{ fontSize:12, color:'var(--text3)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</p>
      <p style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color: color||'var(--text1)' }}>{value}</p>
      {sub && <p style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>{sub}</p>}
    </div>
  )
}

export default function EmployerDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    employerAPI.getContracts().then(r => setContracts(r.data.contracts || [])).finally(() => setLoading(false))
  }, [])

  const active = contracts.filter(c => c.status === 'active').length
  const completed = contracts.filter(c => c.status === 'completed').length

  return (
    <Layout>
      <div className="animate-fadeUp">
        {/* Header */}
        <div style={{ marginBottom:32 }}>
          <p style={{ fontSize:13, color:'var(--text3)', marginBottom:4 }}>
            {new Date().toLocaleDateString('en-IN', { weekday:'long', month:'long', day:'numeric' })}
          </p>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700 }}>
            Good {new Date().getHours()<12?'morning':new Date().getHours()<17?'afternoon':'evening'},{' '}
            <span style={{ color:'var(--primary2)' }}>{user?.full_name?.split(' ')[0]}</span>
          </h1>
        </div>

        {/* Stats */}
        <div className="stagger" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:32 }}>
          <StatCard label="Active contracts" value={active} sub="currently running" color="var(--primary2)" onClick={() => navigate('/employer/contracts')} />
          <StatCard label="Completed" value={completed} sub="total projects" color="#10B981" />
          <StatCard label="Wallet balance" value={`₹${(user?.wallet_balance||0).toLocaleString('en-IN')}`} sub="available for contracts" color="#F59E0B" onClick={() => navigate('/employer/wallet')} />
        </div>

        {/* Quick actions */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:32 }}>
          <button onClick={() => navigate('/employer/hire')} style={{
            background:'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(108,99,255,0.05))',
            border:'1px solid rgba(108,99,255,0.25)', borderRadius:16, padding:'24px',
            textAlign:'left', cursor:'pointer', transition:'all 0.2s', color:'var(--text1)',
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(108,99,255,0.5)'; e.currentTarget.style.transform='translateY(-2px)'}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(108,99,255,0.25)'; e.currentTarget.style.transform='translateY(0)'}}
          >
            <div style={{ fontSize:24, marginBottom:12 }}>✦</div>
            <p style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, marginBottom:4 }}>Hire with AI</p>
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.5 }}>Describe your project, let Claude find the perfect match</p>
          </button>

          <button onClick={() => navigate('/employer/explore')} style={{
            background:'linear-gradient(135deg, rgba(0,212,170,0.1), rgba(0,212,170,0.03))',
            border:'1px solid rgba(0,212,170,0.2)', borderRadius:16, padding:'24px',
            textAlign:'left', cursor:'pointer', transition:'all 0.2s', color:'var(--text1)',
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,212,170,0.4)'; e.currentTarget.style.transform='translateY(-2px)'}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(0,212,170,0.2)'; e.currentTarget.style.transform='translateY(0)'}}
          >
            <div style={{ fontSize:24, marginBottom:12 }}>◎</div>
            <p style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, marginBottom:4 }}>Explore freelancers</p>
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.5 }}>Browse portfolios by domain, PFI score and rate</p>
          </button>
        </div>

        {/* Recent contracts */}
        {contracts.length > 0 && (
          <div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:600, marginBottom:14 }}>Recent projects</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {contracts.slice(0,5).map(c => (
                <div key={c._id} onClick={() => navigate(`/contract/${c._id}`)}
                  style={{
                    background:'var(--card)', border:'1px solid var(--border)',
                    borderRadius:14, padding:'14px 18px',
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    cursor:'pointer', transition:'all 0.2s',
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--border2)'}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)'}}
                >
                  <div style={{ flex:1, overflow:'hidden', marginRight:16 }}>
                    <p style={{ fontSize:14, fontWeight:500, color:'var(--text1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {c.project_description?.slice(0,70)}...
                    </p>
                    <p style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>₹{c.agreed_price?.toLocaleString('en-IN')} · Due {c.deadline}</p>
                  </div>
                  <span className={`badge ${c.status==='active'?'badge-success':c.status==='completed'?'badge-primary':'badge-warn'}`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {contracts.length === 0 && !loading && (
          <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text3)' }}>
            <p style={{ fontSize:40, marginBottom:12 }}>◎</p>
            <p style={{ fontSize:16, color:'var(--text2)', marginBottom:6 }}>No contracts yet</p>
            <p style={{ fontSize:13 }}>Use "Hire with AI" to find your first freelancer</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
