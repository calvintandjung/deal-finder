'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Property } from '@/lib/types/database'
import { Search, Filter, Plus, MapPin, X } from 'lucide-react'

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    city: '',
    status: '',
    dealType: '',
    minScore: '',
    distress: '',
  })
  const [showFilters, setShowFilters] = useState(true)

  useEffect(() => {
    async function fetchProperties() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('overall_score', { ascending: false })

      if (!error && data) {
        setProperties(data)
      }
      setLoading(false)
    }

    fetchProperties()
  }, [])

  // Apply filters client-side
  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase()
        const matchesAddress = p.address?.toLowerCase().includes(search)
        const matchesCity = p.city?.toLowerCase().includes(search)
        const matchesOwner = p.owner_name?.toLowerCase().includes(search)
        if (!matchesAddress && !matchesCity && !matchesOwner) return false
      }
      
      // City filter
      if (filters.city && !p.city?.toLowerCase().includes(filters.city.toLowerCase())) {
        return false
      }
      
      // Status filter
      if (filters.status && p.status !== filters.status) {
        return false
      }
      
      // Deal type filter
      if (filters.dealType && p.deal_type !== filters.dealType) {
        return false
      }
      
      // Min score filter
      if (filters.minScore) {
        const minScore = parseInt(filters.minScore)
        if (!p.overall_score || p.overall_score < minScore) return false
      }
      
      // Distress filter
      if (filters.distress === 'foreclosure' && !p.pre_foreclosure) return false
      if (filters.distress === 'tax' && !p.tax_delinquent) return false
      if (filters.distress === 'estate' && !p.estate_sale) return false
      if (filters.distress === 'vacant' && !p.vacant) return false
      if (filters.distress === 'absentee' && !p.is_absentee_owner) return false
      
      return true
    })
  }, [properties, filters])

  const clearFilters = () => {
    setFilters({
      search: '',
      city: '',
      status: '',
      dealType: '',
      minScore: '',
      distress: '',
    })
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== '')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-xl font-bold">🏠 Deal Finder</Link>
              <span className="text-gray-500">|</span>
              <h1 className="text-lg font-medium">Properties</h1>
              <span className="text-sm text-gray-400">
                {filteredProperties.length} of {properties.length}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/map"
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Map
              </Link>
              <Link
                href="/properties/new"
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Property
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Search & Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by address, city, or owner..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-lg flex items-center gap-2 ${
                showFilters ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center gap-2 text-red-400"
              >
                <X className="w-5 h-5" />
                Clear
              </button>
            )}
          </div>

          {/* Filter Row */}
          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <select
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                className="px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg"
              >
                <option value="">All Cities</option>
                <option value="Seattle">Seattle</option>
                <option value="Bellevue">Bellevue</option>
                <option value="Kirkland">Kirkland</option>
                <option value="Redmond">Redmond</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg"
              >
                <option value="">All Status</option>
                <option value="new">New</option>
                <option value="researching">Researching</option>
                <option value="contacted">Contacted</option>
                <option value="negotiating">Negotiating</option>
                <option value="under-contract">Under Contract</option>
              </select>

              <select
                value={filters.dealType}
                onChange={(e) => setFilters({ ...filters, dealType: e.target.value })}
                className="px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg"
              >
                <option value="">All Types</option>
                <option value="wholesaling">Wholesaling</option>
                <option value="adu">ADU/DADU</option>
                <option value="teardown">Teardown</option>
                <option value="fix-flip">Fix & Flip</option>
              </select>

              <select
                value={filters.minScore}
                onChange={(e) => setFilters({ ...filters, minScore: e.target.value })}
                className="px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg"
              >
                <option value="">Any Score</option>
                <option value="80">80+ (Excellent)</option>
                <option value="60">60+ (Good)</option>
                <option value="40">40+ (Fair)</option>
              </select>

              <select
                value={filters.distress}
                onChange={(e) => setFilters({ ...filters, distress: e.target.value })}
                className="px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg"
              >
                <option value="">All Distress</option>
                <option value="foreclosure">Pre-Foreclosure</option>
                <option value="tax">Tax Delinquent</option>
                <option value="estate">Estate Sale</option>
                <option value="vacant">Vacant</option>
                <option value="absentee">Absentee Owner</option>
              </select>
            </div>
          )}
        </div>

        {/* Properties Grid */}
        {filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProperties.map((property) => (
              <Link
                key={property.id}
                href={`/properties/${property.id}`}
                className="bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors overflow-hidden"
              >
                {/* Score Badge */}
                <div className="p-4 pb-0 flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white truncate">
                      {property.address}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {property.city}, {property.state} {property.zip}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-sm font-bold ${
                    (property.overall_score || 0) >= 80 ? 'bg-green-500/20 text-green-400' :
                    (property.overall_score || 0) >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                    (property.overall_score || 0) >= 40 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {property.overall_score || 0}
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-3">
                  {/* Property Info */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Lot:</span>
                      <span className="ml-1 text-white">
                        {property.lot_size_sqft?.toLocaleString() || '?'} sqft
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Value:</span>
                      <span className="ml-1 text-white">
                        ${((property.assessed_value || property.market_value || 0) / 1000).toFixed(0)}k
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className="ml-1 text-white capitalize">
                        {property.deal_type || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <span className="ml-1 text-white capitalize">
                        {property.status}
                      </span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1">
                    {property.is_absentee_owner && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                        Absentee
                      </span>
                    )}
                    {property.pre_foreclosure && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                        Foreclosure
                      </span>
                    )}
                    {property.tax_delinquent && (
                      <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">
                        Tax Delinq
                      </span>
                    )}
                    {property.estate_sale && (
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                        Estate
                      </span>
                    )}
                    {property.vacant && (
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                        Vacant
                      </span>
                    )}
                    {(property.lot_size_sqft || 0) >= 6000 && (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                        ADU Lot
                      </span>
                    )}
                  </div>

                  {/* Owner */}
                  {property.owner_name && (
                    <div className="text-sm text-gray-400 truncate">
                      👤 {property.owner_name}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No properties match your filters</p>
            <button
              onClick={clearFilters}
              className="text-blue-400 hover:text-blue-300"
            >
              Clear filters
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
