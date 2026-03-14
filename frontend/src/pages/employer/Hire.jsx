import { useState } from 'react'
import Layout from '../../components/Layout'
import { aiAPI, employerAPI } from '../../services/api'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function EmployerHire() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your AI hiring assistant. Tell me about your project — what do you need built or done?" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [reqData, setReqData] = useState(null)
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState([])
  const [hireMode, setHireMode] = useState('direct')

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input }
    const newHist = [...messages, userMsg]
    setMessages(newHist)
    setInput('')
    setLoading(true)
    try {
      const hist = messages.slice(1).map(m => ({ role: m.role, content: m.content }))
      const res = await aiAPI.chat({ history: hist, message: input, stage: 'requirement' })
      setMessages([...newHist, { role: 'assistant', content: res.data.response }])
      if (res.data.complete && res.data.data) {
        setReqData(res.data.data)
        toast.success('Requirements complete! Ready to search.')
      }
    } catch {
      toast.error('AI error — try again')
    } finally {
      setLoading(false)
    }
  }

  const searchFreelancers = async () => {
    if (!reqData) return
    setSearching(true)
    try {
      const res = await employerAPI.explore({
        domain: reqData.required_domains?.[0],
        min_pfi: reqData.min_pfi || 0,
        limit: 12
      })
      setResults(res.data.freelancers || [])
    } catch {
      toast.error('Search failed')
    } finally {
      setSearching(false)
    }
  }

  const sendOffers = async () => {
    if (selected.length === 0) { toast.error('Select at least one freelancer'); return }
    try {
      await employerAPI.sendOffers({
        freelancer_ids: selected,
        project_description: reqData.project_description,
        budget: reqData.budget,
        deadline: reqData.deadline,
        buffer_days: reqData.buffer_days || 3,
        required_domains: reqData.required_domains || [],
      })
      toast.success(`Offers sent!`)
      navigate('/employer/contracts')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    }
  }

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <Layout>
      <div className="animate-fadeUp">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700 }}>Hire with AI</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            Describe your project — AI will extract specs and find the best freelancers
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, display: 'flex', flexDirection: 'column', height: 540 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>AI Requirement Chat</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Llama 3.3 70B</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div className={m.role === 'user' ? 'bubble-me' : 'bubble-other'} style={{ maxWidth: '80%', padding: '10px 14px', fontSize: 13, lineHeight: 1.6 }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div className="bubble-other" style={{ padding: '10px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="loader" style={{ width: 14, height: 14 }} />
                    AI is thinking...
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Describe your project..."
                className="input"
                style={{ flex: 1 }}
              />
              <button onClick={send} disabled={loading || !input.trim()} className="btn-primary" style={{ padding: '10px 18px' }}>
                Send
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {reqData ? (
              <div style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 14, padding: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 10 }}>✓ Requirements extracted</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[['Budget', `₹${reqData.budget?.toLocaleString()}`], ['Deadline', reqData.deadline], ['Buffer', `${reqData.buffer_days} days`], ['Min PFI', reqData.min_pfi || 0]].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--text3)' }}>{k}</span>
                      <span style={{ color: 'var(--text1)', fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <button onClick={searchFreelancers} disabled={searching} className="btn-primary" style={{ width: '100%', marginTop: 14, padding: 9, fontSize: 12, borderRadius: 10 }}>
                  {searching ? 'Searching...' : '◎ Find freelancers'}
                </button>
              </div>
            ) : (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text1)' }}>How it works</p>
                {['Describe your project', 'AI suggests improvements', 'Requirements confirmed', 'Find best matches', 'Send offers'].map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(108,99,255,0.15)', color: 'var(--primary2)', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>{s}</span>
                  </div>
                ))}
              </div>
            )}

            {reqData && (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hiring mode</p>
                {[['direct', 'Direct hire', 'First to accept wins'], ['tender', 'Tender float', 'Freelancers apply']].map(([m, l, s]) => (
                  <button key={m} onClick={() => setHireMode(m)} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10, marginBottom: 6, background: hireMode === m ? 'rgba(108,99,255,0.12)' : 'transparent', border: `1px solid ${hireMode === m ? 'rgba(108,99,255,0.3)' : 'var(--border)'}`, cursor: 'pointer' }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: hireMode === m ? 'var(--primary2)' : 'var(--text2)' }}>{l}</p>
                    <p style={{ fontSize: 11, color: 'var(--text3)' }}>{s}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {results.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>Matching freelancers</h2>
              {selected.length > 0 && (
                <button onClick={sendOffers} className="btn-primary" style={{ padding: '9px 20px', fontSize: 13 }}>
                  Send to {selected.length} freelancer{selected.length > 1 ? 's' : ''}
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {results.map(f => {
                const sel = selected.includes(f._id)
                return (
                  <div key={f._id} onClick={() => toggleSelect(f._id)} style={{ background: sel ? 'rgba(108,99,255,0.06)' : 'var(--card)', border: `1px solid ${sel ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 14, padding: 16, cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)' }}>{f.full_name}</p>
                        <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{f.domains?.slice(0, 2).join(' · ')}</p>
                      </div>
                      <span className="badge badge-primary">{f.pfi_score?.toFixed(0) || 70}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }} className="line-clamp-2">{f.bio}</p>
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>₹{f.hourly_rate}/hr · {f.years_experience}y exp</p>
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