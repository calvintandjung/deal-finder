import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { TrendingUp, Clock, DollarSign } from 'lucide-react'

export default async function DealsPage() {
  const supabase = await createClient()
  
  const { data: activeDeals } = await supabase
    .from('properties')
    .select('*')
    .in('status', ['contacted', 'negotiating', 'under-contract'])
    .order('updated_at', { ascending: false })
  
  return (
    <div className="px-4 sm:px-0">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Active Deals</h1>
          <p className="mt-2 text-sm text-gray-700">
            Track your deals in progress
          </p>
        </div>
      </div>

      {activeDeals && activeDeals.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {activeDeals.map((property) => (
            <div key={property.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {property.address}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {property.city}, {property.state} {property.zip}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    property.status === 'under-contract'
                      ? 'bg-green-100 text-green-800'
                      : property.status === 'negotiating'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {property.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="w-4 h-4 mr-1 text-gray-400" />
                  {property.market_value
                    ? `$${property.market_value.toLocaleString()}`
                    : 'N/A'}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <TrendingUp className="w-4 h-4 mr-1 text-gray-400" />
                  Score: {property.overall_score || 'N/A'}
                </div>
              </div>

              {property.deal_type && (
                <div className="mt-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    {property.deal_type}
                  </span>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  Updated {new Date(property.updated_at).toLocaleDateString()}
                </div>
                <Link
                  href={`/properties/${property.id}`}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8 bg-white shadow rounded-lg p-12 text-center">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No active deals</h3>
          <p className="mt-1 text-sm text-gray-500">
            Start reaching out to property owners to get deals in the pipeline.
          </p>
          <div className="mt-6">
            <Link
              href="/properties"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Browse Properties
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
