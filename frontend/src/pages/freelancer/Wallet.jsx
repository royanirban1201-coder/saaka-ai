import Layout from '../../components/Layout'
import { useEffect, useState } from 'react'
import { freelancerAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function FreelancerWallet() {
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    freelancerAPI.getWallet().then(r => setWallet(r.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const transfer = async (contractId) => {
    try {
      const res = await freelancerAPI.transferToBank(contractId)
      toast.success(res.data.message)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Transfer failed')
    }
  }

  const statusColor = { locked: 'bg-gray-100 text-gray-600', partially_unlocked: 'bg-amber-100 text-amber-700', unlocked: 'bg-green-100 text-green-700', refunded: 'bg-red-100 text-red-700', transferred: 'bg-blue-100 text-blue-700' }

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Wallet</h1>
      <p className="text-gray-500 text-sm mb-6">Each project has its own wallet. Funds unlock on completion.</p>

      {loading ? <p className="text-gray-400">Loading...</p> : (
        <div className="max-w-2xl">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              ['Total balance', `₹${(wallet?.total_balance || 0).toFixed(0)}`, 'text-gray-900'],
              ['Locked', `₹${(wallet?.total_locked || 0).toFixed(0)}`, 'text-amber-600'],
              ['Unlocked', `₹${(wallet?.total_unlocked || 0).toFixed(0)}`, 'text-green-600'],
            ].map(([l, v, cls]) => (
              <div key={l} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">{l}</p>
                <p className={`text-xl font-bold ${cls}`}>{v}</p>
              </div>
            ))}
          </div>

          <h2 className="font-semibold text-gray-800 mb-3">Per-contract wallets</h2>
          {wallet?.wallets?.length === 0 ? (
            <p className="text-sm text-gray-400">No wallet instances yet. Complete a project to earn.</p>
          ) : (
            <div className="space-y-3">
              {wallet?.wallets?.map(w => (
                <div key={w._id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Contract wallet</p>
                      <p className="text-xs text-gray-400 mt-0.5">Total: ₹{w.total_amount?.toFixed(0)}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[w.status] || 'bg-gray-100 text-gray-600'}`}>
                      {w.status?.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-gray-500">Accumulated</span>
                    <span className="font-medium text-gray-900">₹{w.locked_balance?.toFixed(0)}</span>
                  </div>

                  {w.status === 'unlocked' && (
                    <button onClick={() => transfer(w.contract_id)}
                      className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                      Transfer to bank
                    </button>
                  )}

                  {w.transactions?.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {w.transactions.slice(-3).map((t, i) => (
                        <div key={i} className="flex justify-between text-xs text-gray-500">
                          <span>{t.reason}</span>
                          <span className={t.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                            {t.type === 'credit' ? '+' : '-'}₹{t.amount?.toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
