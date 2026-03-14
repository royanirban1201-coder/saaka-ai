import Layout from '../../components/Layout'
import { useEffect, useState } from 'react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState([])
  const load = () => adminAPI.disputes().then(r => setDisputes(r.data.disputes))
  useEffect(() => { load() }, [])

  const resolve = async (dispute) => {
    const winner = prompt('Winner (employer / freelancer)?')
    const notes = prompt('Admin notes?')
    if (!winner || !notes) return
    try {
      await adminAPI.resolveDispute({ dispute_id: dispute._id, verdict: `Admin resolved: ${winner} wins`, winner, notes })
      toast.success('Dispute resolved')
      load()
    } catch { toast.error('Failed') }
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Dispute Queue</h1>
      {disputes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No open disputes</div>
      ) : (
        <div className="space-y-4">
          {disputes.map(d => (
            <div key={d._id} className="bg-white border border-red-200 rounded-xl p-5">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{d.type?.replace('_', ' ')}</span>
                <span className="text-xs text-gray-400">{new Date(d.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-gray-600 mb-3">Contract: {d.contract_id}</p>
              {d.chat_log && (
                <div className="bg-gray-50 rounded-lg p-3 mb-3 max-h-40 overflow-y-auto">
                  {d.chat_log.map((m, i) => (
                    <p key={i} className="text-xs text-gray-600 mb-1"><strong>{m.sender}:</strong> {m.message} {m.price ? `(₹${m.price})` : ''}</p>
                  ))}
                </div>
              )}
              <button onClick={() => resolve(d)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                Resolve dispute
              </button>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
