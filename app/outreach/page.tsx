import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Phone, Mail, MessageSquare, Calendar } from 'lucide-react'

export default async function OutreachPage() {
  const supabase = await createClient()
  
  const { data: outreachRecords } = await supabase
    .from('outreach_records')
    .select('*, properties(address, city, state, zip)')
    .order('attempted_at', { ascending: false })
    .limit(50)
  
  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'phone':
        return <Phone className="w-4 h-4" />
      case 'email':
        return <Mail className="w-4 h-4" />
      case 'text':
        return <MessageSquare className="w-4 h-4" />
      default:
        return <Calendar className="w-4 h-4" />
    }
  }
  
  return (
    <div className="px-4 sm:px-0">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Outreach Tracking</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your contact attempts and follow-ups
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            Log Contact Attempt
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Phone className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Attempts
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {outreachRecords?.length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MessageSquare className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Contacted
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {outreachRecords?.filter((r) => r.contacted).length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Follow-ups Due
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {outreachRecords?.filter((r) => r.follow_up_date).length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Mail className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Interested
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {outreachRecords?.filter((r) => r.interested).length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Outreach Table */}
      <div className="mt-8 bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Outreach</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Property
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Outcome
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {outreachRecords && outreachRecords.length > 0 ? (
              outreachRecords.map((record: any) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {record.properties?.address || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {record.properties?.city}, {record.properties?.state}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      {getMethodIcon(record.method)}
                      <span className="ml-2 capitalize">{record.method}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(record.attempted_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        record.contacted
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {record.contacted ? 'Contacted' : 'No Answer'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.outcome ? (
                      <span className="capitalize">{record.outcome.replace(/-/g, ' ')}</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/properties/${record.property_id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                  No outreach records yet. Start contacting property owners!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tips */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">Outreach Tips</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• <strong>Phone first</strong>: Highest conversion rate for motivated sellers</li>
          <li>• <strong>Follow up 5-7 times</strong>: Most deals close after multiple touches</li>
          <li>• <strong>Track everything</strong>: Log all attempts, responses, and next steps</li>
          <li>• <strong>Script matters</strong>: "Hi, I'm interested in buying your property at [address]..."</li>
          <li>• <strong>Best times</strong>: Weekday evenings 5-7 PM, Saturday mornings 10-12 PM</li>
        </ul>
      </div>
    </div>
  )
}
