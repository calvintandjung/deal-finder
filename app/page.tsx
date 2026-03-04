import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TrendingUp, Home, Building2, Phone, AlertCircle } from 'lucide-react'

export default async function Dashboard() {
  const supabase = await createClient()
  
  // Fetch dashboard stats
  const { data: properties } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: false })
  
  const { data: activeDeals } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: false })
    .in('status', ['contacted', 'negotiating', 'under-contract'])
  
  const { data: topDeals } = await supabase
    .from('properties')
    .select('*')
    .order('overall_score', { ascending: false })
    .limit(5)
  
  const { data: recentOutreach } = await supabase
    .from('outreach_records')
    .select('*, properties(address, city)')
    .order('attempted_at', { ascending: false })
    .limit(5)
  
  const stats = [
    {
      name: 'Total Properties',
      value: properties?.length || 0,
      icon: Home,
      color: 'bg-blue-500',
    },
    {
      name: 'Active Deals',
      value: activeDeals?.length || 0,
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      name: 'ADU Eligible',
      value: properties?.filter(p => p.adu_eligible).length || 0,
      icon: Building2,
      color: 'bg-purple-500',
    },
    {
      name: 'Outreach This Week',
      value: recentOutreach?.length || 0,
      icon: Phone,
      color: 'bg-orange-500',
    },
  ]
  
  return (
    <div className="px-4 sm:px-0">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Track your real estate investment opportunities
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <Link
            href="/map"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            🗺️ Map View
          </Link>
          <Link
            href="/properties/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Add Property
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${stat.color} rounded-md p-3`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-3xl font-semibold text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Deals */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Top Scored Deals</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {topDeals && topDeals.length > 0 ? (
              topDeals.map((property) => (
                <li key={property.id} className="px-6 py-4 hover:bg-gray-50">
                  <Link href={`/properties/${property.id}`} className="block">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {property.address}
                        </p>
                        <p className="text-sm text-gray-500">
                          {property.city}, {property.state} {property.zip}
                        </p>
                      </div>
                      <div className="ml-4 flex items-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            property.overall_score >= 80
                              ? 'bg-green-100 text-green-800'
                              : property.overall_score >= 60
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          Score: {property.overall_score}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center text-xs text-gray-500">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {property.deal_type || 'Unknown'}
                      </span>
                      {property.adu_eligible && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          ADU Eligible
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))
            ) : (
              <li className="px-6 py-12 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No properties yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding your first property.
                </p>
                <div className="mt-6">
                  <Link
                    href="/properties/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Add Property
                  </Link>
                </div>
              </li>
            )}
          </ul>
        </div>

        {/* Recent Outreach */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Outreach</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {recentOutreach && recentOutreach.length > 0 ? (
              recentOutreach.map((record: any) => (
                <li key={record.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {record.properties?.address || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {record.method} • {new Date(record.attempted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="ml-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.contacted
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {record.contacted ? 'Contacted' : 'No Answer'}
                      </span>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-6 py-12 text-center text-sm text-gray-500">
                No outreach activity yet
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-4">Quick Start Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-medium text-gray-900 mb-2">1. Add Properties</h4>
            <p className="text-sm text-gray-600 mb-3">
              Import properties from King County data or add manually
            </p>
            <Link href="/properties/new" className="text-sm text-blue-600 hover:text-blue-800">
              Add Property →
            </Link>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-medium text-gray-900 mb-2">2. Analyze Deals</h4>
            <p className="text-sm text-gray-600 mb-3">
              Use the calculator to evaluate wholesaling and ADU opportunities
            </p>
            <Link href="/calculator" className="text-sm text-blue-600 hover:text-blue-800">
              Open Calculator →
            </Link>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-medium text-gray-900 mb-2">3. Start Outreach</h4>
            <p className="text-sm text-gray-600 mb-3">
              Track contacts and follow-ups with property owners
            </p>
            <Link href="/outreach" className="text-sm text-blue-600 hover:text-blue-800">
              Manage Outreach →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
