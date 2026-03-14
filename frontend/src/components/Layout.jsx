import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

const navMap = {
  employer: [
    { path: '/employer/dashboard', label: 'Dashboard',   icon: '⬡' },
    { path: '/employer/explore',   label: 'Explore',     icon: '◎' },
    { path: '/employer/hire',      label: 'Hire with AI',icon: '✦' },
    { path: '/employer/contracts', label: 'Contracts',   icon: '◈' },
    { path: '/employer/wallet',    label: 'Wallet',      icon: '◆' },
  ],
  freelancer: [
    { path: '/freelancer/dashboard', label: 'Dashboard',   icon: '⬡' },
    { path: '/freelancer/offers',    label: 'Offers',      icon: '◎' },
    { path: '/freelancer/tenders',   label: 'Tenders',     icon: '◈' },
    { path: '/freelancer/contracts', label: 'My Projects', icon: '✦' },
    { path: '/freelancer/wallet',    label: 'Wallet',      icon: '◆' },
    { path: '/freelancer/pfi',       label: 'PFI Score',   icon: '◉' },
  ],
  admin: [
    { path: '/admin/dashboard', label: 'Overview',  icon: '⬡' },
    { path: '/admin/users',     label: 'Users',     icon: '◎' },
    { path: '/admin/disputes',  label: 'Disputes',  icon: '◈' },
  ],
}

export default function Layout({ children }) {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const nav = navMap[user?.role] || navMap.freelancer

  const pfi = user?.pfi_score || 70
  const pfiColor = pfi >= 80 ? '#10B981' : pfi >= 60 ? '#F59E0B' : '#EF4444'

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>

      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        zIndex: 50,
        top: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{
              width:32, height:32, borderRadius:8,
              background: 'linear-gradient(135deg, #6C63FF, #00D4AA)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:14, fontWeight:700, color:'white',
              fontFamily:'var(--font-display)',
            }}>S</div>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:18, color:'var(--text1)' }}>
              Sakaa<span style={{ color:'var(--primary)' }}>-AI</span>
            </span>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex:1, padding:'12px 10px', overflowY:'auto' }}>
          {nav.map(({ path, label, icon }) => {
            const active = location.pathname === path
            return (
              <Link key={path} to={path} style={{
                display:'flex', alignItems:'center', gap:10,
                padding: '9px 12px',
                borderRadius: 10,
                marginBottom: 2,
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--primary2)' : 'var(--text2)',
                background: active ? 'rgba(108,99,255,0.1)' : 'transparent',
                borderRight: active ? '2px solid var(--primary)' : '2px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if(!active) { e.currentTarget.style.background='var(--bg3)'; e.currentTarget.style.color='var(--text1)' }}}
              onMouseLeave={e => { if(!active) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text2)' }}}
              >
                <span style={{ fontSize:12, opacity:0.7 }}>{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
          <Link to="/settings" style={{
            display:'flex', alignItems:'center', gap:10,
            padding:'9px 12px', borderRadius:10, marginBottom:2,
            fontSize:13, color:'var(--text2)', textDecoration:'none',
            transition:'all 0.15s',
          }}
          onMouseEnter={e=>{ e.currentTarget.style.background='var(--bg3)'; e.currentTarget.style.color='var(--text1)' }}
          onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text2)' }}
          >
            <span style={{fontSize:12,opacity:0.7}}>⚙</span> Settings
          </Link>
          <button onClick={logout} style={{
            display:'flex', alignItems:'center', gap:10,
            padding:'9px 12px', borderRadius:10, width:'100%',
            fontSize:13, color:'#EF4444', background:'transparent',
            border:'none', cursor:'pointer', textAlign:'left',
            transition:'all 0.15s',
          }}
          onMouseEnter={e=>{ e.currentTarget.style.background='rgba(239,68,68,0.08)' }}
          onMouseLeave={e=>{ e.currentTarget.style.background='transparent' }}
          >
            <span style={{fontSize:12,opacity:0.7}}>→</span> Sign out
          </button>
        </div>

        {/* User card */}
        <div style={{
          margin: '0 10px 12px',
          padding: '12px',
          background: 'var(--bg3)',
          borderRadius: 12,
          border: '1px solid var(--border)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:32, height:32, borderRadius:'50%',
              background: `linear-gradient(135deg, var(--primary), var(--accent))`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:12, fontWeight:700, color:'white', flexShrink:0,
            }}>
              {user?.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{ overflow:'hidden', flex:1 }}>
              <p style={{ fontSize:12, fontWeight:600, color:'var(--text1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user?.full_name}
              </p>
              <p style={{ fontSize:11, color:'var(--text3)', textTransform:'capitalize' }}>{user?.role}</p>
            </div>
          </div>
          {user?.role === 'freelancer' && (
            <div style={{ marginTop:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:10, color:'var(--text3)' }}>PFI Score</span>
                <span style={{ fontSize:11, fontWeight:600, color:pfiColor }}>{pfi.toFixed(1)}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width:`${pfi}%`, background:`linear-gradient(90deg, ${pfiColor}, ${pfiColor}88)` }} />
              </div>
              <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:4 }}>
                <span style={{
                  width:6, height:6, borderRadius:'50%',
                  background: user?.available ? '#10B981' : 'var(--text3)',
                  display:'inline-block'
                }} />
                <span style={{ fontSize:10, color: user?.available ? '#10B981' : 'var(--text3)' }}>
                  {user?.available ? 'Open to work' : 'Busy'}
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex:1, marginLeft:220, padding:'32px 36px', maxWidth:'calc(100vw - 220px)' }}>
        {children}
      </main>
    </div>
  )
}
