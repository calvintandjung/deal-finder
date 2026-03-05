'use client'

import { useEffect, useRef, useState } from 'react'
import type { Property } from '@/lib/types/database'

interface PropertyMapProps {
  properties: Property[]
  center?: [number, number]
  zoom?: number
}

export default function PropertyMap({ 
  properties, 
  center = [47.6062, -122.3321], 
  zoom = 11 
}: PropertyMapProps) {
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<any[]>([])
  const cssLoadedRef = useRef(false)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return

    let map: any = null
    let L: any = null

    const initMap = async () => {
      // Load CSS if not already loaded
      if (!cssLoadedRef.current) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
        link.crossOrigin = ''
        document.head.appendChild(link)
        cssLoadedRef.current = true
      }

      // Dynamically import Leaflet
      L = (await import('leaflet')).default
      
      // Fix default marker icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      // Create map if not already created
      if (!mapRef.current && mapContainerRef.current) {
        map = L.map(mapContainerRef.current).setView(center, zoom)
        
        // Add dark tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
          maxZoom: 19,
        }).addTo(map)

        mapRef.current = map
        setMapReady(true)
      }
    }

    initMap()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      setMapReady(false)
    }
  }, [center, zoom])

  // Update markers when properties change
  useEffect(() => {
    if (!mapRef.current || !mapReady) return

    const updateMarkers = async () => {
      const L = (await import('leaflet')).default
      
      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []

      // Add new markers
      properties.forEach((property) => {
        if (!property.lat || !property.lng) return

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

        const marker = L.marker([property.lat, property.lng], { icon })
          .addTo(mapRef.current)
          .bindPopup(popupContent, {
            className: 'custom-popup',
          })

        markersRef.current.push(marker)
      })
    }

    updateMarkers()
  }, [properties, mapReady])

  return (
    <>
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
      <div ref={mapContainerRef} className="w-full h-full" />
    </>
  )
}
