import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { freelancerAPI } from '../../services/api'
import useAuthStore from '../../store/authStore'

export default function FreelancerDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [contracts, setContracts] = useState([])
  const [offers, setOffers] = useState([])
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      freelancerAPI.getContracts().then(r => setContracts(r.data.contracts||[])),
      freelancerAPI.getOffers().then(r => setOffers(r.data.offers||[])),
      freelancerAPI.getWallet().then(r => setWallet(r.data)),
    ]).finally(() => setLoading(false))
  }, [])

  const active = contracts.filter(c=>c.status==='active').length
  const pfi = user?.pfi_score || 70
  const pfiColor = pfi>=80?'#10B981':pfi>=60?'#F59E0B':'#EF4444'

  return (
    <Layout>
      <div className="animate-fadeUp">
        {/* Header */}
        <div style={{ marginBottom:32, display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div>
            <p style={{ fontSize:13, color:'var(--text3)', marginBottom:4 }}>
              {new Date().toLocaleDateString('en-IN',{weekday:'long',month:'long',day:'numeric'})}
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700 }}>
              Hey, <span style={{color:'var(--primary2)'}}>{user?.full_name?.split(' ')[0]}</span>
            </h1>
          </div>
          {/* Availability toggle */}
          <button
            onClick={async()=>{
              const newVal = !user?.available
              await freelancerAPI.setAvailability(newVal)
              useAuthStore.getState().setUser({...user, available:newVal})
            }}
            style={{
              display:'flex', alignItems:'center', gap:8,
              background:'var(--card)', border:'1px solid var(--border)',
              borderRadius:10, padding:'8px 14px', cursor:'pointer', color:'var(--text2)', fontSize:13,
            }}
          >
            <span style={{ width:8, height:8, borderRadius:'50%', background: user?.available?'#10B981':'var(--text3)', display:'inline-block' }} />
            {user?.available ? 'Open to work' : 'Set as busy'}
          </button>
        </div>

        {/* Stats */}
        <div className="stagger" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:32 }}>
          {[
            { label:'Active projects', value:`${active}/3`, color:'var(--primary2)', path:'/freelancer/contracts' },
            { label:'PFI Score', value:pfi.toFixed(1), color:pfiColor, path:'/freelancer/pfi' },
            { label:'Pending offers', value:offers.length, color:'#F59E0B', path:'/freelancer/offers' },
            { label:'Wallet balance', value:`₹${(wallet?.total_balance||0).toFixed(0)}`, color:'#10B981', path:'/freelancer/wallet' },
          ].map(({label,value,color,path})=>(
            <div key={label} onClick={()=>navigate(path)} style={{
              background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20,
              cursor:'pointer', transition:'all 0.2s',
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--border2)'; e.currentTarget.style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='translateY(0)'}}
            >
              <p style={{fontSize:11,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>{label}</p>
              <p style={{fontFamily:'var(--font-display)',fontSize:26,fontWeight:700,color}}>{value}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:32 }}>
          <button onClick={()=>navigate('/freelancer/offers')} style={{
            background:'linear-gradient(135deg,rgba(108,99,255,0.12),rgba(108,99,255,0.04))',
            border:'1px solid rgba(108,99,255,0.22)', borderRadius:16, padding:'20px',
            textAlign:'left', cursor:'pointer', transition:'all 0.2s', color:'var(--text1)', position:'relative',
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(108,99,255,0.45)'; e.currentTarget.style.transform='translateY(-2px)'}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(108,99,255,0.22)'; e.currentTarget.style.transform='translateY(0)'}}
          >
            {offers.length>0 && (
              <span style={{
                position:'absolute',top:16,right:16,
                width:20,height:20,borderRadius:'50%',
                background:'#EF4444', color:'white', fontSize:11, fontWeight:600,
                display:'flex',alignItems:'center',justifyContent:'center',
              }}>{offers.length}</span>
            )}
            <div style={{fontSize:22,marginBottom:10}}>◎</div>
            <p style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:600,marginBottom:3}}>Offers inbox</p>
            <p style={{fontSize:12,color:'var(--text2)'}}>View and respond to project offers</p>
          </button>

          <button onClick={()=>navigate('/freelancer/tenders')} style={{
            background:'linear-gradient(135deg,rgba(0,212,170,0.1),rgba(0,212,170,0.03))',
            border:'1px solid rgba(0,212,170,0.18)', borderRadius:16, padding:'20px',
            textAlign:'left', cursor:'pointer', transition:'all 0.2s', color:'var(--text1)',
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,212,170,0.38)'; e.currentTarget.style.transform='translateY(-2px)'}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(0,212,170,0.18)'; e.currentTarget.style.transform='translateY(0)'}}
          >
            <div style={{fontSize:22,marginBottom:10}}>◈</div>
            <p style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:600,marginBottom:3}}>Browse tenders</p>
            <p style={{fontSize:12,color:'var(--text2)'}}>Apply to open jobs matching your profile</p>
          </button>
        </div>

        {/* Active projects */}
        {active > 0 && (
          <div>
            <h2 style={{fontFamily:'var(--font-display)',fontSize:17,fontWeight:600,marginBottom:14}}>Active projects</h2>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {contracts.filter(c=>c.status==='active').map(c=>{
                const done = c.milestones?.filter(m=>m.status==='approved').length||0
                const total = c.milestones?.length||1
                const pct = Math.round((done/total)*100)
                return (
                  <div key={c._id} onClick={()=>navigate('/freelancer/contracts')} style={{
                    background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:'16px 20px',
                    cursor:'pointer',transition:'border-color 0.2s',
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--border2)'}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)'}}
                  >
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                      <p style={{fontSize:14,fontWeight:500,color:'var(--text1)',maxWidth:'70%',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {c.project_description?.slice(0,60)}...
                      </p>
                      <span style={{fontSize:12,color:'var(--text3)'}}>Due {c.deadline}</span>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div className="progress-track" style={{flex:1}}>
                        <div className="progress-fill" style={{width:`${pct}%`}} />
                      </div>
                      <span style={{fontSize:12,color:'var(--text2)',minWidth:40,textAlign:'right'}}>{done}/{total}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
