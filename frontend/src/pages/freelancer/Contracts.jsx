import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { freelancerAPI } from '../../services/api'
import toast from 'react-hot-toast'

function StatusBadge({ status }) {
  const map = {
    pending: 'bg-gray-100 text-gray-600',
    submitted: 'bg-blue-100 text-blue-700',
    aqa_passed: 'bg-yellow-100 text-yellow-700',
    correction_needed: 'bg-red-100 text-red-700',
    approved: 'bg-green-100 text-green-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status?.replace('_', ' ')}
    </span>
  )
}

function MilestoneCard({ milestone, contractId, onRefresh }) {
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAQA, setShowAQA] = useState(false)
  const [deadlineMissed] = useState(
    milestone.deadline && new Date() > new Date(milestone.deadline) && milestone.status === 'pending'
  )

  const submit = async () => {
    if (!url.trim()) { toast.error('Add a submission URL'); return }
    setLoading(true)
    try {
      const res = await freelancerAPI.submitMilestone({ milestone_id: milestone._id, submission_url: url, notes })
      toast.success(`Submitted! AQA result: ${res.data.aqa_result.verdict}`)
      setShowAQA(true)
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Submission failed')
    } finally { setLoading(false) }
  }

  const aqa = milestone.aqa_result

  return (
    <div className={`border rounded-xl p-4 ${milestone.status === 'approved' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-medium text-sm text-gray-900">{milestone.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">Deadline: {milestone.deadline} · {milestone.payout_percent}% payout</p>
        </div>
        <StatusBadge status={milestone.status} />
      </div>

      <p className="text-xs text-gray-600 mb-2">{milestone.description}</p>

      {/* Checklist */}
      {milestone.checklist?.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-700 mb-1">Checklist:</p>
          <ul className="space-y-0.5">
            {milestone.checklist.map((item, i) => (
              <li key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[8px]
                  ${milestone.status === 'approved' ? 'bg-green-500' : 'bg-gray-300'}`}>
                  {milestone.status === 'approved' ? '✓' : ''}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Deadline missed — buffer reveal */}
      {deadlineMissed && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-medium text-amber-800">Deadline missed!</p>
          <p className="text-xs text-amber-700 mt-0.5">
            You have {milestone.buffer_days || '?'} buffer days remaining. Submit before buffer expires to avoid full refund.
          </p>
        </div>
      )}

      {/* AQA result */}
      {aqa && (
        <div className={`mb-3 rounded-lg p-3 border text-xs
          ${aqa.verdict === 'pass' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="font-medium mb-1">
            AQA {aqa.verdict?.toUpperCase()} — Score: {aqa.score}/100
          </p>
          <p className="text-gray-700">{aqa.feedback}</p>
          {aqa.corrections_needed?.length > 0 && (
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              {aqa.corrections_needed.map((c, i) => <li key={i} className="text-red-700">{c}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Employer feedback */}
      {milestone.employer_flagged && milestone.employer_feedback && (
        <div className="mb-3 bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs">
          <p className="font-medium text-orange-800">Employer correction request:</p>
          <p className="text-orange-700 mt-0.5">{milestone.employer_feedback}</p>
        </div>
      )}

      {/* Submit form */}
      {['pending','correction_needed'].includes(milestone.status) && (
        <div className="space-y-2 mt-3 pt-3 border-t border-gray-100">
          <input value={url} onChange={e => setUrl(e.target.value)}
            placeholder="GitHub link / file URL / design link"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-400" />
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Notes for reviewer (optional)"
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-400" />
          <button onClick={submit} disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Submitting & running AQA...' : 'Submit for AQA review'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function FreelancerContracts() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeContract, setActiveContract] = useState(null)

  const load = async () => {
    try {
      const res = await freelancerAPI.getContracts()
      setContracts(res.data.contracts)
      if (res.data.contracts.length > 0 && !activeContract) {
        setActiveContract(res.data.contracts[0]._id)
      }
    } catch { toast.error('Failed to load contracts') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const current = contracts.find(c => c._id === activeContract)

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Projects</h1>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : contracts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No active projects yet</p>
          <p className="text-sm mt-1">Accept an offer to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-6">
          {/* Contract list */}
          <div className="col-span-1 space-y-2">
            {contracts.map(c => (
              <button key={c._id} onClick={() => setActiveContract(c._id)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition-all
                  ${activeContract === c._id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <p className="font-medium text-gray-900 line-clamp-2">{c.project_description?.slice(0,60)}...</p>
                <p className="text-gray-400 mt-1">₹{c.agreed_price?.toLocaleString()}</p>
                <p className="mt-1">
                  <span className={`px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {c.status}
                  </span>
                </p>
              </button>
            ))}
          </div>

          {/* Milestones */}
          {current && (
            <div className="col-span-3">
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">{current.project_description?.slice(0,80)}...</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Budget: ₹{current.agreed_price?.toLocaleString()} · Deadline: {current.deadline}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Progress</p>
                    <p className="text-lg font-bold text-indigo-600">
                      {current.milestones?.filter(m => m.status === 'approved').length || 0}
                      /{current.milestones?.length || 0}
                    </p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${((current.milestones?.filter(m=>m.status==='approved').length||0)/(current.milestones?.length||1))*100}%` }} />
                </div>
              </div>

              <div className="space-y-3">
                {current.milestones?.map((m, i) => (
                  <MilestoneCard key={m._id} milestone={m} contractId={current._id} onRefresh={load} />
                ))}
              </div>

              {/* Transfer button if wallet unlocked */}
              {current.status === 'awaiting_transfer' && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-green-800 font-medium text-sm">Project complete! Your wallet is unlocked.</p>
                  <button
                    onClick={async () => {
                      try {
                        const res = await freelancerAPI.transferToBank(current._id)
                        toast.success(res.data.message)
                        load()
                      } catch (err) { toast.error(err.response?.data?.detail || 'Transfer failed') }
                    }}
                    className="mt-3 bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                    Transfer to bank account
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
