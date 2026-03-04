'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Property } from '@/lib/types/database'

// Seattle center coordinates
const SEATTLE_CENTER: [number, number] = [47.6062, -122.3321]

export default function MapPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [filters, setFilters] = useState({
    dealType: '',
    minScore: 0,
    distress: '',
  })
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

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

  // Initialize Leaflet map
  useEffect(() => {
    if (typeof window === 'undefined' || loading || mapLoaded) return

    // Load Leaflet dynamically
    const loadLeaflet = async () => {
      const L = (await import('leaflet')).default
      
      // Fix default marker icon
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      if (!mapContainerRef.current || mapRef.current) return

      // Create map
      const map = L.map(mapContainerRef.current).setView(SEATTLE_CENTER, 11)
      
      // Add dark tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map
      setMapLoaded(true)
    }

    loadLeaflet()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [loading, mapLoaded])

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

  // Update markers when filters change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return

    const loadMarkers = async () => {
      const L = (await import('leaflet')).default
      
      // Clear existing markers
      mapRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) {
          mapRef.current.removeLayer(layer)
        }
      })

      // Add new markers
      filteredProperties.forEach((property) => {
        const score = property.overall_score || 0
        let color = '#ef4444' // red
        if (score >= 80) color = '#22c55e'
        else if (score >= 60) color = '#eab308'
        else if (score >= 40) color = '#f97316'

        const icon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              width: 32px;
              height: 32px;
              background: ${color};
              border: 2px solid white;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              box-shadow: 0 2px 5px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <span style="
                transform: rotate(45deg);
                color: white;
                font-size: 11px;
                font-weight: bold;
              ">${score}</span>
            </div>
          `,
          iconSize: [32, 42],
          iconAnchor: [16, 42],
          popupAnchor: [0, -42],
        })

        const formatCurrency = (value: number | undefined | null) => {
          if (!value) return 'N/A'
          return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD', 
            maximumFractionDigits: 0 
          }).format(value)
        }

        const badges = []
        if (property.pre_foreclosure) badges.push('<span style="background:#ef444433;color:#f87171;padding:2px 6px;border-radius:4px;font-size:11px;">Foreclosure</span>')
        if (property.tax_delinquent) badges.push('<span style="background:#f9731633;color:#fb923c;padding:2px 6px;border-radius:4px;font-size:11px;">Tax Delinquent</span>')
        if (property.estate_sale) badges.push('<span style="background:#eab30833;color:#fbbf24;padding:2px 6px;border-radius:4px;font-size:11px;">Estate</span>')
        if (property.vacant) badges.push('<span style="background:#a855f733;color:#c084fc;padding:2px 6px;border-radius:4px;font-size:11px;">Vacant</span>')

        const popupContent = `
          <div style="padding:12px;min-width:250px;background:#1f2937;color:white;border-radius:8px;">
            <h3 style="font-weight:600;font-size:14px;margin-bottom:8px;">${property.address}</h3>
            <p style="color:#9ca3af;font-size:12px;margin-bottom:12px;">${property.city}, ${property.state} ${property.zip}</p>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;margin-bottom:12px;">
              <div><span style="color:#9ca3af;">Value:</span> <span style="color:white;">${formatCurrency(property.market_value)}</span></div>
              <div><span style="color:#9ca3af;">Lot:</span> <span style="color:white;">${property.lot_size_sqft?.toLocaleString() || '?'} sqft</span></div>
              <div><span style="color:#9ca3af;">Score:</span> <span style="color:${color};font-weight:bold;">${score}</span></div>
              <div><span style="color:#9ca3af;">Type:</span> <span style="color:white;text-transform:capitalize;">${property.deal_type || 'N/A'}</span></div>
            </div>
            
            ${badges.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px;">${badges.join('')}</div>` : ''}
            
            <a href="/properties/${property.id}" style="display:block;background:#2563eb;color:white;text-align:center;padding:8px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:500;">
              View Details →
            </a>
          </div>
        `

        L.marker([property.lat!, property.lng!], { icon })
          .addTo(mapRef.current)
          .bindPopup(popupContent, {
            className: 'custom-popup',
          })
      })
    }

    loadMarkers()
  }, [filteredProperties, mapLoaded])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <style>{`
        .custom-popup .leaflet-popup-content-wrapper {
          background: transparent;
          box-shadow: none;
          padding: 0;
        }
        .custom-popup .leaflet-popup-content {
          margin: 0;
        }
        .custom-popup .leaflet-popup-tip {
          background: #1f2937;
        }
        .leaflet-container {
          background: #030712;
        }
      `}</style>

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
        <div ref={mapContainerRef} className="w-full h-full" />
        
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
                {Math.round(filteredProperties.reduce((sum, p) => sum + (p.overall_score || 0), 0) / filteredProperties.length) || 0}
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
