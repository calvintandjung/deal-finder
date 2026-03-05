'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Property } from '@/lib/types/database'
import { SkipTraceButton } from '@/lib/skipTrace/SkipTraceButton'

export default function PropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProperty = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      setError('Property not found')
      setLoading(false)
      return
    }

    setProperty(data)
    setLoading(false)
  }

  useEffect(() => {
    if (params.id) {
      fetchProperty()
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Property Not Found</h1>
          <Link href="/properties" className="text-blue-400 hover:text-blue-300">
            ← Back to Properties
          </Link>
        </div>
      </div>
    )
  }

  const formatCurrency = (value: number | undefined | null) => {
    if (!value) return 'N/A'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
  }

  const formatNumber = (value: number | undefined | null) => {
    if (!value) return 'N/A'
    return new Intl.NumberFormat('en-US').format(value)
  }

  const getScoreColor = (score: number | undefined | null) => {
    if (!score) return 'text-gray-400'
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    if (score >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500/20 text-blue-400'
      case 'researching': return 'bg-yellow-500/20 text-yellow-400'
      case 'contacted': return 'bg-purple-500/20 text-purple-400'
      case 'negotiating': return 'bg-orange-500/20 text-orange-400'
      case 'under-contract': return 'bg-green-500/20 text-green-400'
      case 'closed': return 'bg-emerald-500/20 text-emerald-400'
      case 'dead': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/properties" className="text-gray-400 hover:text-white">
              ← Back
            </Link>
            <h1 className="text-xl font-semibold">{property.address}</h1>
            <span className={`px-2 py-1 rounded text-sm ${getStatusColor(property.status)}`}>
              {property.status}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-bold ${getScoreColor(property.overall_score)}`}>
              {property.overall_score || 0}
            </span>
            <span className="text-gray-500 text-sm">Score</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Location Card */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                📍 Location
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-sm">Address</p>
                  <p className="font-medium">{property.address}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">City, State</p>
                  <p className="font-medium">{property.city}, {property.state} {property.zip}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">County</p>
                  <p className="font-medium">{property.county || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Parcel #</p>
                  <p className="font-medium">{property.parcel_number || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Property Details */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                🏠 Property Details
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-500 text-sm">Lot Size</p>
                  <p className="font-medium">{formatNumber(property.lot_size_sqft)} sqft</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Building Size</p>
                  <p className="font-medium">{formatNumber(property.building_sqft)} sqft</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Beds / Baths</p>
                  <p className="font-medium">{property.bedrooms || '?'} / {property.bathrooms || '?'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Year Built</p>
                  <p className="font-medium">{property.year_built || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Zoning</p>
                  <p className="font-medium">{property.zoning || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Property Type</p>
                  <p className="font-medium capitalize">{property.property_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Corner Lot</p>
                  <p className="font-medium">{property.is_corner_lot ? '✅ Yes' : '❌ No'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Alley Access</p>
                  <p className="font-medium">{property.has_alley_access ? '✅ Yes' : '❌ No'}</p>
                </div>
              </div>
            </div>

            {/* Values */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                💰 Values & Assessment
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-gray-500 text-sm">Assessed Value</p>
                  <p className="font-medium text-lg">{formatCurrency(property.assessed_value)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Market Value</p>
                  <p className="font-medium text-lg text-green-400">{formatCurrency(property.market_value)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Last Sale Price</p>
                  <p className="font-medium">{formatCurrency(property.last_sale_price)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Land Value</p>
                  <p className="font-medium">{formatCurrency(property.assessed_land_value)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Improvement Value</p>
                  <p className="font-medium">{formatCurrency(property.assessed_improvement_value)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Last Sale Date</p>
                  <p className="font-medium">{property.last_sale_date || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Owner Info */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                👤 Owner Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-sm">Owner Name</p>
                  <p className="font-medium">{property.owner_name || 'Unknown - Needs Skip Trace'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Days Owned</p>
                  <p className="font-medium">{property.days_owned ? `${formatNumber(property.days_owned)} days (${Math.round(property.days_owned / 365)} years)` : 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 text-sm">Mailing Address</p>
                  <p className="font-medium">{property.owner_mailing_address || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Phone</p>
                  <p className="font-medium">{property.owner_phone || 'Needs Skip Trace'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Email</p>
                  <p className="font-medium">{property.owner_email || 'Needs Skip Trace'}</p>
                </div>
              </div>
              <div className="mt-4">
                <SkipTraceButton
                  propertyId={property.id}
                  ownerName={property.owner_name || 'Unknown'}
                  hasContact={!!(property.owner_phone || property.owner_email)}
                  onSuccess={async () => {
                    // Refresh property data to show new contact info (without page reload)
                    await fetchProperty()
                  }}
                />
              </div>
            </div>

            {/* Notes */}
            {property.notes && (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  📝 Notes
                </h2>
                <p className="text-gray-300 whitespace-pre-wrap">{property.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Scores */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-lg font-semibold mb-4">📊 Deal Scores</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Overall</span>
                    <span className={`font-bold ${getScoreColor(property.overall_score)}`}>
                      {property.overall_score || 0}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
                      style={{ width: `${property.overall_score || 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Wholesaling</span>
                    <span className={`font-bold ${getScoreColor(property.wholesaling_score)}`}>
                      {property.wholesaling_score || 0}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${property.wholesaling_score || 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">ADU Potential</span>
                    <span className={`font-bold ${getScoreColor(property.adu_score)}`}>
                      {property.adu_score || 0}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full">
                    <div 
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${property.adu_score || 0}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-800">
                <p className="text-gray-500 text-sm">Deal Type</p>
                <p className="font-medium text-lg capitalize">{property.deal_type || 'Not classified'}</p>
              </div>
            </div>

            {/* Distress Indicators */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-lg font-semibold mb-4">⚠️ Distress Indicators</h2>
              <div className="space-y-2">
                <div className={`flex items-center gap-2 ${property.is_absentee_owner ? 'text-yellow-400' : 'text-gray-600'}`}>
                  {property.is_absentee_owner ? '✅' : '❌'} Absentee Owner
                </div>
                <div className={`flex items-center gap-2 ${property.tax_delinquent ? 'text-red-400' : 'text-gray-600'}`}>
                  {property.tax_delinquent ? '✅' : '❌'} Tax Delinquent
                </div>
                <div className={`flex items-center gap-2 ${property.pre_foreclosure ? 'text-red-400' : 'text-gray-600'}`}>
                  {property.pre_foreclosure ? '✅' : '❌'} Pre-Foreclosure
                </div>
                <div className={`flex items-center gap-2 ${property.estate_sale ? 'text-yellow-400' : 'text-gray-600'}`}>
                  {property.estate_sale ? '✅' : '❌'} Estate Sale
                </div>
                <div className={`flex items-center gap-2 ${property.divorce_filing ? 'text-orange-400' : 'text-gray-600'}`}>
                  {property.divorce_filing ? '✅' : '❌'} Divorce Filing
                </div>
                <div className={`flex items-center gap-2 ${property.vacant ? 'text-yellow-400' : 'text-gray-600'}`}>
                  {property.vacant ? '✅' : '❌'} Vacant
                </div>
                <div className={`flex items-center gap-2 ${property.code_violations > 0 ? 'text-orange-400' : 'text-gray-600'}`}>
                  {property.code_violations > 0 ? '✅' : '❌'} Code Violations ({property.code_violations})
                </div>
                <div className={`flex items-center gap-2 ${property.has_hoa ? 'text-red-400' : 'text-green-400'}`}>
                  {property.has_hoa ? '⚠️ Has HOA' : '✅ No HOA'}
                </div>
              </div>
            </div>

            {/* Source */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-lg font-semibold mb-4">📂 Data Source</h2>
              <p className="text-gray-400 text-sm">Source</p>
              <p className="font-medium mb-2">{property.source || 'Unknown'}</p>
              {property.source_url && (
                <a 
                  href={property.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  View Source →
                </a>
              )}
            </div>

            {/* Actions */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-lg font-semibold mb-4">🎯 Actions</h2>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
                  📞 Log Outreach
                </button>
                <button className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors">
                  🧮 Run Analysis
                </button>
                <Link 
                  href="/calculator"
                  className="block w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors text-center"
                >
                  📊 Open Calculator
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
