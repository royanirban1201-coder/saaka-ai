import Layout from '../../components/Layout'
import { useEffect, useState } from 'react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminAPI.dashboard().then(r => setStats(r.data)).finally(() => setLoading(false))
  }, [])

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
      {loading ? <p className="text-gray-400">Loading...</p> : (
        <div>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              ['Total users', stats?.total_users, 'text-gray-900'],
              ['Employers', stats?.employers, 'text-blue-600'],
              ['Freelancers', stats?.freelancers, 'text-indigo-600'],
              ['Active contracts', stats?.active_contracts, 'text-green-600'],
              ['Completed', stats?.completed_contracts, 'text-teal-600'],
              ['Open disputes', stats?.open_disputes, 'text-red-600'],
              ['Escrow held', `₹${(stats?.escrow_held || 0).toFixed(0)}`, 'text-amber-600'],
            ].map(([l, v, cls]) => (
              <div key={l} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">{l}</p>
                <p className={`text-xl font-bold ${cls}`}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  )
}
