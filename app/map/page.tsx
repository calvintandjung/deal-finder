'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import type { Property } from '@/lib/types/database'

// Dynamically import the map component (no SSR)
const PropertyMap = dynamic(() => import('@/components/PropertyMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-950">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  )
})

// Seattle center coordinates
const SEATTLE_CENTER: [number, number] = [47.6062, -122.3321]

export default function MapPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    dealType: '',
    minScore: 0,
    distress: '',
  })

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

  // Generate approximate coordinates for properties without lat/lng
  const propertiesWithCoords = useMemo(() => {
    return properties.map((p) => {
      if (p.lat && p.lng) return p
      
      // Generate pseudo-random coords in Seattle area based on address hash
      const hash = p.address.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0)
        return a & a
      }, 0)
      
      const latOffset = (Math.abs(hash % 1000) / 1000) * 0.15 - 0.075
      const lngOffset = (Math.abs((hash >> 10) % 1000) / 1000) * 0.2 - 0.1
      
      return {
        ...p,
        lat: SEATTLE_CENTER[0] + latOffset,
        lng: SEATTLE_CENTER[1] + lngOffset,
      }
    })
  }, [properties])

  const filteredProperties = useMemo(() => {
    return propertiesWithCoords.filter(p => {
      if (filters.dealType && p.deal_type !== filters.dealType) return false
      if (filters.minScore && (p.overall_score || 0) < filters.minScore) return false
      if (filters.distress === 'foreclosure' && !p.pre_foreclosure) return false
      if (filters.distress === 'tax' && !p.tax_delinquent) return false
      if (filters.distress === 'estate' && !p.estate_sale) return false
      if (filters.distress === 'vacant' && !p.vacant) return false
      return true
    })
  }, [propertiesWithCoords, filters])

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
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-[1000]">
        <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold text-white">
              🏠 Deal Finder
            </Link>
            <span className="text-gray-500">|</span>
            <h1 className="text-lg font-medium">Map View</h1>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-3">
            <select
              value={filters.dealType}
              onChange={(e) => setFilters({ ...filters, dealType: e.target.value })}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm"
            >
              <option value="">All Types</option>
              <option value="wholesaling">Wholesaling</option>
              <option value="adu">ADU/DADU</option>
              <option value="fix-flip">Fix & Flip</option>
            </select>
            
            <select
              value={filters.minScore}
              onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value) })}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm"
            >
              <option value="0">Any Score</option>
              <option value="40">40+</option>
              <option value="60">60+</option>
              <option value="80">80+</option>
            </select>
            
            <select
              value={filters.distress}
              onChange={(e) => setFilters({ ...filters, distress: e.target.value })}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm"
            >
              <option value="">All Properties</option>
              <option value="foreclosure">Pre-Foreclosure</option>
              <option value="tax">Tax Delinquent</option>
              <option value="estate">Estate Sale</option>
              <option value="vacant">Vacant</option>
            </select>
            
            <div className="text-sm text-gray-400">
              {filteredProperties.length} properties
            </div>
            
            <Link 
              href="/properties"
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
            >
              List View
            </Link>
          </div>
        </div>
      </header>

      {/* Map Container */}
      <div className="relative" style={{ height: 'calc(100vh - 57px)' }}>
        <PropertyMap 
          properties={filteredProperties}
          center={SEATTLE_CENTER}
          zoom={11}
        />
        
        {/* Legend */}
        <div className="absolute bottom-6 left-6 bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-800 p-4 z-[500]">
          <h3 className="text-sm font-semibold mb-3">Deal Score</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span>80+ Excellent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              <span>60-79 Good</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-500"></div>
              <span>40-59 Fair</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span>&lt;40 Low</span>
            </div>
          </div>
        </div>
        
        {/* Stats Panel */}
        <div className="absolute top-6 right-6 bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-800 p-4 z-[500] w-64">
          <h3 className="text-sm font-semibold mb-3">Quick Stats</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Properties</span>
              <span className="font-medium">{filteredProperties.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Avg Score</span>
              <span className="font-medium">
                {filteredProperties.length > 0 
                  ? Math.round(filteredProperties.reduce((sum, p) => sum + (p.overall_score || 0), 0) / filteredProperties.length)
                  : 0
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Pre-Foreclosure</span>
              <span className="font-medium text-red-400">
                {filteredProperties.filter(p => p.pre_foreclosure).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tax Delinquent</span>
              <span className="font-medium text-orange-400">
                {filteredProperties.filter(p => p.tax_delinquent).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">ADU Eligible</span>
              <span className="font-medium text-blue-400">
                {filteredProperties.filter(p => p.deal_type === 'adu').length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
