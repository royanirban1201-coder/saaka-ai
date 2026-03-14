// Admin Users
import Layout from '../../components/Layout'
import { useEffect, useState } from 'react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [role, setRole] = useState('')
  const load = () => adminAPI.users(role || undefined).then(r => setUsers(r.data.users))
  useEffect(() => { load() }, [role])

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">User Management</h1>
      <div className="flex gap-2 mb-4">
        {['', 'employer', 'freelancer'].map(r => (
          <button key={r} onClick={() => setRole(r)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${role === r ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600'}`}>
            {r || 'All'}
          </button>
        ))}
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Name', 'Email', 'Role', 'PFI', 'KYC', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u._id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{u.full_name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3 capitalize"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{u.role}</span></td>
                <td className="px-4 py-3">{u.pfi_score ? u.pfi_score.toFixed(1) : '—'}</td>
                <td className="px-4 py-3">{u.kyc_verified ? <span className="text-green-600 text-xs">Verified</span> : <span className="text-amber-600 text-xs">Pending</span>}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {!u.kyc_verified && (
                      <button onClick={() => adminAPI.approveKyc(u._id).then(() => { toast.success('KYC approved'); load() })}
                        className="text-xs text-green-600 hover:underline">Approve KYC</button>
                    )}
                    <button onClick={() => { const r = prompt('Ban reason?'); if(r) adminAPI.banUser(u._id, r).then(() => { toast.success('User banned'); load() }) }}
                      className="text-xs text-red-500 hover:underline">Ban</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
