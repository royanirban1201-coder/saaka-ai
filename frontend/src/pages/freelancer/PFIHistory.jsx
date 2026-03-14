import Layout from '../../components/Layout'
import { useEffect, useState } from 'react'
import { aiAPI, freelancerAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function PFIHistory() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    aiAPI.pfiHistory().then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  const scoreColor = (score) =>
    score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">PFI Score</h1>
      <p className="text-gray-500 text-sm mb-6">Professional Fidelity Index — your reputation on Sakaa-AI</p>

      {loading ? <p className="text-gray-400">Loading...</p> : (
        <div className="max-w-xl">
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 text-center">
            <p className="text-xs text-gray-500 mb-1">Current PFI Score</p>
            <p className={`text-6xl font-bold ${scoreColor(data?.current_score)}`}>
              {data?.current_score?.toFixed(1)}
            </p>
            <p className="text-sm text-gray-400 mt-2">out of 100</p>
            <div className="mt-4 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${
                data?.current_score >= 80 ? 'bg-green-500' : data?.current_score >= 60 ? 'bg-amber-500' : 'bg-red-500'
              }`} style={{ width: `${data?.current_score || 0}%` }} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <p className="text-sm font-medium text-gray-800 mb-2">What affects your PFI</p>
            <div className="space-y-2">
              {[
                ['Milestone accuracy', '25%'],
                ['Deadline adherence', '30%'],
                ['AQA pass rate', '25%'],
                ['Employer satisfaction', '20%'],
              ].map(([label, weight]) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-medium text-gray-800">{weight}</span>
                </div>
              ))}
            </div>
          </div>

          <h2 className="font-semibold text-gray-800 mb-3">Score history</h2>
          {data?.history?.length === 0 ? (
            <p className="text-sm text-gray-400">No history yet. Complete your first project.</p>
          ) : (
            <div className="space-y-3">
              {data?.history?.map((h, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">{new Date(h.timestamp).toLocaleDateString('en-IN')}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{h.old_score?.toFixed(1)}</span>
                      <span className="text-xs">→</span>
                      <span className={`text-sm font-bold ${scoreColor(h.new_score)}`}>{h.new_score?.toFixed(1)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{h.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
