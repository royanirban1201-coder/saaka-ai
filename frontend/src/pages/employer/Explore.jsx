import Layout from '../../components/Layout'
import { useEffect, useState } from 'react'
import { employerAPI, aiAPI } from '../../services/api'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'

// ── EMPLOYER EXPLORE ──────────────────────────────────
export function EmployerExplore() {
  const [freelancers, setFreelancers] = useState([])
  const [domain, setDomain] = useState('')
  const [minPfi, setMinPfi] = useState(0)
  const [loading, setLoading] = useState(false)
  const [summaries, setSummaries] = useState({})
  const navigate = useNavigate()

  const search = async () => {
    setLoading(true)
    try {
      const res = await employerAPI.explore({ domain, min_pfi: minPfi })
      setFreelancers(res.data.freelancers)
    } catch { toast.error('Search failed') }
    finally { setLoading(false) }
  }

  useEffect(() => { search() }, [])

  const getAISummary = async (fid) => {
    try {
      const res = await aiAPI.portfolioSummary(fid)
      setSummaries(p => ({ ...p, [fid]: res.data.summary }))
    } catch {}
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Explore freelancers</h1>
      <div className="flex gap-3 mb-6">
        <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="Filter by domain..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
        <input type="number" value={minPfi} onChange={e => setMinPfi(+e.target.value)} placeholder="Min PFI"
          className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
        <button onClick={search} disabled={loading}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {freelancers.map(f => (
          <div key={f._id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-200 transition-all">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-gray-900">{f.full_name}</p>
                <p className="text-xs text-gray-500">{f.domains?.slice(0,2).join(' · ')}</p>
              </div>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">PFI {f.pfi_score?.toFixed(0)}</span>
            </div>
            <p className="text-xs text-gray-600 line-clamp-2 mb-3">{f.bio}</p>
            {summaries[f._id] && (
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-2 mb-3 text-xs text-purple-800 leading-relaxed">{summaries[f._id]}</div>
            )}
            <div className="flex gap-2">
              <button onClick={() => navigate(`/employer/freelancer/${f._id}`)}
                className="flex-1 border border-gray-200 text-gray-600 py-1.5 rounded-lg text-xs hover:bg-gray-50">View profile</button>
              {!summaries[f._id] && (
                <button onClick={() => getAISummary(f._id)}
                  className="flex-1 border border-purple-200 text-purple-600 py-1.5 rounded-lg text-xs hover:bg-purple-50">AI summary</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}

// ── EMPLOYER CONTRACTS ────────────────────────────────
export function EmployerContracts() {
  const [contracts, setContracts] = useState([])
  const navigate = useNavigate()
  useEffect(() => {
    employerAPI.getContracts().then(r => setContracts(r.data.contracts)).catch(()=>{})
  }, [])
  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Active contracts</h1>
      {contracts.length === 0 ? <p className="text-gray-400">No contracts yet</p> : (
        <div className="space-y-3">
          {contracts.map(c => (
            <div key={c._id} onClick={() => navigate(`/contract/${c._id}`)}
              className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-indigo-200">
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-gray-900 max-w-lg">{c.project_description?.slice(0,80)}...</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.status==='active'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{c.status}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">₹{c.agreed_price?.toLocaleString()} · Due {c.deadline}</p>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}

// ── EMPLOYER WALLET ───────────────────────────────────
export function EmployerWallet() {
  const [balance, setBalance] = useState(0)
  useEffect(() => {
    employerAPI.getWallet().then(r => setBalance(r.data.balance)).catch(()=>{})
  }, [])
  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Wallet</h1>
      <div className="max-w-sm">
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <p className="text-xs text-gray-500 mb-1">Available balance</p>
          <p className="text-3xl font-bold text-gray-900">₹{balance?.toLocaleString()}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
          Top up your wallet before creating a contract. The full project amount is held in escrow at contract start.
        </div>
      </div>
    </Layout>
  )
}

// ── TENDER FLOAT PAGE ─────────────────────────────────
export function TenderFloat() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ title:'', description:'', required_domains:'', min_pfi:60, budget_min:5000, budget_max:50000, deadline:'', buffer_days:3 })
  const [loading, setLoading] = useState(false)
  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
  const submit = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      await employerAPI.createTender({ ...form, required_domains: form.required_domains.split(',').map(s=>s.trim()) })
      toast.success('Tender posted!')
      navigate('/employer/contracts')
    } catch { toast.error('Failed') } finally { setLoading(false) }
  }
  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Float a tender</h1>
      <div className="max-w-xl">
        <form onSubmit={submit} className="space-y-4 bg-white border border-gray-200 rounded-xl p-6">
          <div><label className="text-sm text-gray-700 mb-1 block">Title</label><input className={inp} required value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} /></div>
          <div><label className="text-sm text-gray-700 mb-1 block">Description</label><textarea className={inp} rows={4} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} /></div>
          <div><label className="text-sm text-gray-700 mb-1 block">Required domains (comma separated)</label><input className={inp} value={form.required_domains} onChange={e=>setForm(p=>({...p,required_domains:e.target.value}))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm text-gray-700 mb-1 block">Min PFI</label><input type="number" className={inp} value={form.min_pfi} onChange={e=>setForm(p=>({...p,min_pfi:+e.target.value}))} /></div>
            <div><label className="text-sm text-gray-700 mb-1 block">Deadline</label><input type="date" className={inp} value={form.deadline} onChange={e=>setForm(p=>({...p,deadline:e.target.value}))} /></div>
            <div><label className="text-sm text-gray-700 mb-1 block">Budget min (₹)</label><input type="number" className={inp} value={form.budget_min} onChange={e=>setForm(p=>({...p,budget_min:+e.target.value}))} /></div>
            <div><label className="text-sm text-gray-700 mb-1 block">Budget max (₹)</label><input type="number" className={inp} value={form.budget_max} onChange={e=>setForm(p=>({...p,budget_max:+e.target.value}))} /></div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{loading?'Posting...':'Post tender'}</button>
        </form>
      </div>
    </Layout>
  )
}

// ── FREELANCER PROFILE VIEW (employer sees) ───────────
export function FreelancerProfile() {
  const { id } = useParams()
  const [f, setF] = useState(null)
  const [summary, setSummary] = useState('')
  useEffect(() => {
    employerAPI.getFreelancer(id).then(r => setF(r.data))
    aiAPI.portfolioSummary(id).then(r => setSummary(r.data.summary)).catch(()=>{})
  }, [id])
  if (!f) return <Layout><p className="text-gray-400">Loading...</p></Layout>
  return (
    <Layout>
      <div className="max-w-2xl">
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{f.full_name}</h1>
              <p className="text-gray-500 text-sm">{f.bio}</p>
            </div>
            <span className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-medium">PFI {f.pfi_score?.toFixed(1)}</span>
          </div>
          {summary && <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-xs text-purple-800 mb-4 leading-relaxed"><strong>AI summary:</strong> {summary}</div>}
          <div className="flex flex-wrap gap-2 mb-4">{f.domains?.map(d => <span key={d} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{d}</span>)}</div>
          <div className="grid grid-cols-3 gap-4 text-center text-xs text-gray-500">
            <div><p className="font-bold text-gray-900 text-lg">₹{f.hourly_rate}/hr</p>Rate</div>
            <div><p className="font-bold text-gray-900 text-lg">{f.years_experience}y</p>Experience</div>
            <div><p className="font-bold text-gray-900 text-lg">{f.completed_projects}</p>Projects done</div>
          </div>
        </div>
        {f.portfolio_links?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="font-semibold text-gray-800 mb-2 text-sm">Portfolio</h2>
            {f.portfolio_links.map((l, i) => <a key={i} href={l} target="_blank" rel="noreferrer" className="block text-sm text-indigo-600 hover:underline mb-1">{l}</a>)}
          </div>
        )}
      </div>
    </Layout>
  )
}

// ── CONTRACT DETAIL (shared) ──────────────────────────
export function ContractDetail() {
  const { id } = useParams()
  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Contract details</h1>
      <p className="text-gray-500 text-sm">Contract ID: {id}</p>
    </Layout>
  )
}

export default EmployerExplore
