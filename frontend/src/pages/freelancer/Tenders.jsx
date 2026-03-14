// FREELANCER TENDERS
import Layout from '../../components/Layout'
import { useEffect, useState } from 'react'
import { freelancerAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function FreelancerTenders() {
  const [tenders, setTenders] = useState([])
  const [loading, setLoading] = useState(true)
  const [prices, setPrices] = useState({})

  useEffect(() => {
    freelancerAPI.browseTenders()
      .then(r => setTenders(r.data.tenders))
      .finally(() => setLoading(false))
  }, [])

  const apply = async (tenderId) => {
    const price = parseFloat(prices[tenderId] || 0)
    if (!price) { toast.error('Enter your proposed price'); return }
    try {
      await freelancerAPI.applyTender(tenderId, price)
      toast.success('Application submitted!')
      setTenders(prev => prev.map(t => t._id === tenderId ? { ...t, already_applied: true } : t))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    }
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Browse tenders</h1>
      <p className="text-gray-500 text-sm mb-6">Jobs matching your domains and PFI score.</p>

      {loading ? <p className="text-gray-400">Loading...</p>
      : tenders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>No open tenders matching your profile right now</p>
          <p className="text-sm mt-1">Raise your PFI score to unlock more tenders</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {tenders.map(t => (
            <div key={t._id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-gray-900">{t.title}</p>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Open</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{t.employer_name} · Due {t.deadline}</p>
              <p className="text-sm text-gray-700 mb-3 line-clamp-3">{t.description}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {t.required_domains?.map(d => (
                  <span key={d} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{d}</span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Budget: ₹{t.budget_min?.toLocaleString()} – ₹{t.budget_max?.toLocaleString()} · Min PFI: {t.min_pfi}
              </p>
              {t.already_applied ? (
                <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg">Applied</span>
              ) : (
                <div className="flex gap-2">
                  <input type="number" value={prices[t._id] || ''}
                    onChange={e => setPrices(p => ({ ...p, [t._id]: e.target.value }))}
                    placeholder="Your price (₹)"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
                  <button onClick={() => apply(t._id)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                    Apply
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
