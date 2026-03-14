import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { freelancerAPI, aiAPI } from '../../services/api'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function FreelancerOffers() {
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkResult, setCheckResult] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    freelancerAPI.getOffers()
      .then(r => setOffers(r.data.offers))
      .catch(() => toast.error('Failed to load offers'))
      .finally(() => setLoading(false))
  }, [])

  const checkWork = async (offer) => {
    try {
      const res = await aiAPI.workCheck({
        offer_deadline: offer.deadline,
        offer_description: offer.project_description,
        offer_budget: offer.budget
      })
      setCheckResult(prev => ({ ...prev, [offer._id]: res.data }))
    } catch {}
  }

  const accept = async (offerId) => {
    try {
      await freelancerAPI.acceptOffer(offerId)
      toast.success('Offer accepted! Contract created.')
      navigate('/freelancer/contracts')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cannot accept offer')
    }
  }

  const reject = async (offerId) => {
    await freelancerAPI.rejectOffer(offerId)
    setOffers(prev => prev.filter(o => o._id !== offerId))
    toast.success('Offer declined')
  }

  const recColor = { accept: 'text-green-700 bg-green-50', risky: 'text-amber-700 bg-amber-50', reject: 'text-red-700 bg-red-50' }

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Offers inbox</h1>

      {loading ? <p className="text-gray-400">Loading...</p>
      : offers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No pending offers</p>
          <p className="text-sm mt-1">Employers will send you offers based on your profile and PFI score</p>
        </div>
      ) : (
        <div className="space-y-4">
          {offers.map(offer => {
            const check = checkResult[offer._id]
            return (
              <div key={offer._id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{offer.company_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {offer.required_domains?.join(' · ')} · ₹{offer.budget?.toLocaleString()} · Due {offer.deadline}
                    </p>
                  </div>
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">Direct offer</span>
                </div>

                <p className="text-sm text-gray-700 mb-4 leading-relaxed line-clamp-3">
                  {offer.project_description}
                </p>

                {/* AI work check result */}
                {check && (
                  <div className={`mb-3 rounded-lg px-3 py-2 text-xs font-medium ${recColor[check.recommendation]}`}>
                    AI recommendation: {check.recommendation?.toUpperCase()} — {check.reason}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button onClick={() => accept(offer._id)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                    Accept offer
                  </button>
                  <button onClick={() => reject(offer._id)}
                    className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                    Decline
                  </button>
                  {!check && (
                    <button onClick={() => checkWork(offer)}
                      className="border border-indigo-200 text-indigo-600 px-4 py-2 rounded-lg text-sm hover:bg-indigo-50">
                      Check with AI
                    </button>
                  )}
                  <button onClick={() => navigate(`/negotiation/${offer._id}`)}
                    className="border border-amber-200 text-amber-600 px-4 py-2 rounded-lg text-sm hover:bg-amber-50">
                    Negotiate price
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
