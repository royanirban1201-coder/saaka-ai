import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text1)', overflow: 'hidden' }}>

      {/* Ambient background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 80% 50% at 20% -10%, rgba(108,99,255,0.12) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 80% 110%, rgba(0,212,170,0.08) 0%, transparent 60%)
        `
      }} />

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: 64,
        background: 'rgba(7,7,15,0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg,#6C63FF,#00D4AA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'white'
          }}>S</div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>
            Sakaa<span style={{ color: 'var(--primary)' }}>-AI</span>
          </span>
        </div>
        <button onClick={() => navigate('/login')} className="btn-ghost" style={{ padding: '8px 18px', fontSize: 13 }}>
          Sign in
        </button>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', zIndex: 1, padding: '160px 48px 80px', textAlign: 'center' }}>
        <div className="animate-fadeUp" style={{ marginBottom: 20 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)',
            borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 500,
            color: 'var(--primary2)', letterSpacing: '0.04em',
          }}>
            ✦ Autonomous AI Freelance Platform
          </span>
        </div>

        <h1 className="animate-fadeUp" style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(36px,5.5vw,68px)',
          fontWeight: 800, lineHeight: 1.08, marginBottom: 16, letterSpacing: '-0.03em',
          animationDelay: '0.08s',
        }}>
          Welcome to Sakaa
        </h1>
        <h2 className="animate-fadeUp" style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(20px,3vw,36px)',
          fontWeight: 500, lineHeight: 1.3, marginBottom: 28, letterSpacing: '-0.02em',
          color: 'var(--text2)', animationDelay: '0.12s',
        }}>
          The{' '}
          <span style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AI Mediator
          </span>
          {' '}between employers and freelancers
        </h2>

        <p className="animate-fadeUp" style={{
          fontSize: 16, color: 'var(--text3)', maxWidth: 480, margin: '0 auto 52px',
          lineHeight: 1.7, animationDelay: '0.16s',
        }}>
          Smart hiring · Automated escrow · AI quality checks · Zero disputes
        </p>

        {/* Two big CTAs */}
        <div className="animate-fadeUp" style={{
          display: 'flex', gap: 16, justifyContent: 'center',
          animationDelay: '0.22s',
        }}>
          <button onClick={() => navigate('/signup?role=employer')} style={{
            background: 'linear-gradient(135deg, var(--primary), #5B52E8)',
            color: 'white', border: 'none', borderRadius: 16,
            padding: '18px 40px', fontSize: 16, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s',
            fontFamily: 'var(--font-display)',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(108,99,255,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            Continue as Employer
          </button>
          <button onClick={() => navigate('/signup?role=freelancer')} style={{
            background: 'transparent', color: 'var(--text1)',
            border: '1px solid var(--border2)', borderRadius: 16,
            padding: '18px 40px', fontSize: 16, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s',
            fontFamily: 'var(--font-display)',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text1)' }}
          >
            Continue as Freelancer
          </button>
        </div>

        <p className="animate-fadeUp" style={{ fontSize: 12, color: 'var(--text3)', marginTop: 20, animationDelay: '0.26s' }}>
          Already have an account?{' '}
          <span onClick={() => navigate('/login')} style={{ color: 'var(--primary2)', cursor: 'pointer', textDecoration: 'underline' }}>
            Sign in
          </span>
        </p>
      </section>

      {/* 4 engine cards — like the screenshot */}
      <section style={{ position: 'relative', zIndex: 1, padding: '0 48px 80px' }}>
        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text3)', marginBottom: 40 }}>
          Four autonomous engines running in parallel.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, maxWidth: 1200, margin: '0 auto' }}>
          {[
            { cat: 'NLP PRECISION', icon: '◈', iconColor: '#00D4AA', title: 'Requirement Engine', sub: 'NLP-POWERED DECOMPOSITION', subColor: '#00D4AA', desc: 'Ingests vague employer prompts and autonomously generates structured technical roadmaps with time-bound milestones and checklists.' },
            { cat: 'FINANCIAL INTEGRITY', icon: '⬡', iconColor: '#6C63FF', title: 'Escrow Vault', sub: 'AUTONOMOUS LIQUIDITY ENGINE', subColor: '#6C63FF', desc: 'Acts as a secure financial custodian. Receives total project funds upfront, then releases micro-payouts as milestones are verified.', featured: true },
            { cat: 'VERIFICATION LOGIC', icon: '◉', iconColor: '#10B981', title: 'Quality AI (AQA)', sub: 'AUTOMATED VERIFICATION LAYER', subColor: '#10B981', desc: 'Evaluates submitted work against original requirements. Triggers payment, feedback, or refund protocols with zero human bias.' },
            { cat: 'SCORING ACCURACY', icon: '◆', iconColor: '#F59E0B', title: 'PFI Score', sub: 'PROFESSIONAL FIDELITY INDEX', subColor: '#F59E0B', desc: 'Dynamic reputation engine. Tracks milestone accuracy, deadline adherence, and AQA pass rate to build a verifiable credit score.' },
          ].map(({ cat, icon, iconColor, title, sub, subColor, desc, featured }) => (
            <div key={title} style={{
              background: featured ? 'var(--card2)' : 'var(--card)',
              border: `1px solid ${featured ? 'rgba(108,99,255,0.3)' : 'var(--border)'}`,
              borderRadius: 16, padding: '28px 24px',
              transition: 'transform 0.2s, border-color 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = iconColor + '40' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = featured ? 'rgba(108,99,255,0.3)' : 'var(--border)' }}
            >
              <p style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 16 }}>{cat}</p>
              <div style={{ fontSize: 24, color: iconColor, marginBottom: 16 }}>{icon}</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text1)' }}>{title}</h3>
              <p style={{ fontSize: 10, fontWeight: 700, color: subColor, letterSpacing: '0.08em', marginBottom: 14 }}>{sub}</p>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>{desc}</p>
              {featured && <div style={{ height: 2, background: `linear-gradient(90deg, ${iconColor}, transparent)`, marginTop: 20, borderRadius: 2 }} />}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}