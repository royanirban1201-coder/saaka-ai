import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { negotiationAPI } from '../../services/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

export default function NegotiationRoom() {
  const { id: contractId } = useParams()
  const { user } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [outcome, setOutcome] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    loadMessages()
    const iv = setInterval(loadMessages, 5000)
    return () => clearInterval(iv)
  }, [contractId])

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}) }, [messages])

  const loadMessages = async () => {
    try {
      const res = await negotiationAPI.getMessages(contractId)
      setMessages(res.data.messages||[])
    } catch {}
  }

  const send = async () => {
    if (!input.trim() || loading) return
    setLoading(true)
    try {
      const res = await negotiationAPI.sendMessage({ contract_id:contractId, message:input, proposed_price:price?parseFloat(price):null })
      setInput(''); setPrice('')
      await loadMessages()
      if (res.data.outcome==='deal') {
        setOutcome({ type:'deal', price:res.data.agreed_price })
        toast.success(`Deal reached at ₹${res.data.agreed_price?.toLocaleString('en-IN')}!`)
      } else if (res.data.outcome==='deadlock') {
        setOutcome({ type:'deadlock' })
        toast.error('Deadlocked — escalated to admin')
      }
    } catch (err) { toast.error(err.response?.data?.detail||'Failed to send') }
    finally { setLoading(false) }
  }

  const fmt = ts => new Date(ts).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})

  return (
    <Layout>
      <div className="animate-fadeUp" style={{ maxWidth:680, margin:'0 auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <h1 style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:700}}>Negotiation Room</h1>
            <p style={{fontSize:12,color:'var(--text3)',marginTop:4}}>
              Direct conversation — no AI involvement. Messages are stored for record.
            </p>
          </div>
          <span className="badge badge-warn">Round {messages.length}</span>
        </div>

        {outcome && (
          <div style={{
            padding:'14px 18px', borderRadius:14, marginBottom:16, fontSize:13, fontWeight:500,
            background: outcome.type==='deal'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',
            border: `1px solid ${outcome.type==='deal'?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.25)'}`,
            color: outcome.type==='deal'?'#10B981':'#EF4444',
          }}>
            {outcome.type==='deal'
              ? `✓ Deal reached at ₹${outcome.price?.toLocaleString('en-IN')}. Contract is active.`
              : '✕ Deadlocked after 5 rounds. Escalated to admin for resolution.'}
          </div>
        )}

        <div style={{
          background:'var(--card)', border:'1px solid var(--border)', borderRadius:18,
          display:'flex', flexDirection:'column', height:500,
        }}>
          <div style={{ flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:10 }}>
            {messages.length===0 && (
              <div style={{textAlign:'center',color:'var(--text3)',marginTop:80}}>
                <p style={{fontSize:32,marginBottom:8}}>◎</p>
                <p style={{fontSize:14}}>Start the negotiation</p>
                <p style={{fontSize:12,marginTop:4}}>Propose a price to begin</p>
              </div>
            )}
            {messages.map((m,i) => {
              const isMe = m.sender_id === user?._id
              return (
                <div key={i} style={{display:'flex',justifyContent:isMe?'flex-end':'flex-start'}}>
                  <div style={{maxWidth:'72%'}}>
                    <p style={{fontSize:11,color:'var(--text3)',marginBottom:3,paddingLeft:4,paddingRight:4}}>
                      {isMe?'You':m.sender_role} · {fmt(m.timestamp)}
                    </p>
                    <div className={isMe?'bubble-me':'bubble-other'} style={{padding:'10px 14px',fontSize:13,lineHeight:1.6}}>
                      {m.content}
                      {m.proposed_price && (
                        <div style={{
                          marginTop:8, padding:'5px 10px', borderRadius:8, fontSize:12, fontWeight:600,
                          background:isMe?'rgba(255,255,255,0.15)':'rgba(108,99,255,0.15)',
                          color:isMe?'white':'var(--primary2)',
                          display:'inline-block',
                        }}>
                          Proposed: ₹{m.proposed_price?.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {!outcome && (
            <div style={{padding:'14px 16px',borderTop:'1px solid var(--border)'}}>
              <div style={{display:'flex',gap:10,marginBottom:8}}>
                <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="₹ Propose price"
                  className="input" style={{width:160,flexShrink:0}} type="number" />
                <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
                  placeholder="Your message..." className="input" style={{flex:1}} />
                <button onClick={send} disabled={loading||!input.trim()} className="btn-primary" style={{padding:'10px 16px',flexShrink:0}}>
                  {loading ? <span className="loader" style={{width:14,height:14}} /> : 'Send'}
                </button>
              </div>
              <p style={{fontSize:11,color:'var(--text3)',textAlign:'center'}}>
                After 5 rounds without agreement, automatically escalated to admin.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
