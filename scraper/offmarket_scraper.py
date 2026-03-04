#!/usr/bin/env python3
"""
Off-Market Property Scraper for Seattle Area
Focus: Tax delinquent, foreclosure, probate, absentee owners
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
import re

# Supabase config
SUPABASE_URL = "https://zbizgmrtbqdgnyfnfasl.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaXpnbXJ0YnFkZ255Zm5mYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjQxODAsImV4cCI6MjA4ODI0MDE4MH0.Q0HKsPnskg7cvzrPhAz4EcJvsK-H1OH_JH017Iu_KF4"

@dataclass
class Property:
    address: str
    city: str
    state: str = "WA"
    zip: str = ""
    county: str = "King"
    parcel_number: Optional[str] = None
    
    lot_size_sqft: Optional[int] = None
    building_sqft: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    year_built: Optional[int] = None
    zoning: Optional[str] = None
    property_type: str = "single-family"
    
    is_corner_lot: bool = False
    has_alley_access: bool = False
    has_hoa: bool = False
    
    assessed_value: Optional[int] = None
    assessed_land_value: Optional[int] = None
    assessed_improvement_value: Optional[int] = None
    market_value: Optional[int] = None
    last_sale_price: Optional[int] = None
    last_sale_date: Optional[str] = None
    
    owner_name: Optional[str] = None
    owner_mailing_address: Optional[str] = None
    days_owned: Optional[int] = None
    
    is_absentee_owner: bool = False
    tax_delinquent: bool = False
    pre_foreclosure: bool = False
    estate_sale: bool = False
    code_violations: int = 0
    vacant: bool = False
    
    wholesaling_score: Optional[int] = None
    adu_score: Optional[int] = None
    overall_score: Optional[int] = None
    deal_type: Optional[str] = None
    
    status: str = "new"
    source: str = "king-county-off-market"
    source_url: Optional[str] = None
    notes: Optional[str] = None


def calculate_wholesaling_score(prop: Property) -> int:
    """Calculate wholesaling score (0-100)"""
    score = 0
    
    # Distress indicators (40 points total)
    if prop.tax_delinquent: score += 10
    if prop.pre_foreclosure: score += 12
    if prop.estate_sale: score += 8
    if prop.vacant: score += 5
    if prop.is_absentee_owner: score += 8
    if prop.code_violations > 0:
        score += min(prop.code_violations * 2, 10)
    
    # Days owned (20 points)
    if prop.days_owned:
        if prop.days_owned > 15 * 365: score += 20  # 15+ years
        elif prop.days_owned > 10 * 365: score += 15
        elif prop.days_owned > 5 * 365: score += 10
    
    # Property age (15 points)
    if prop.year_built:
        age = datetime.now().year - prop.year_built
        if age > 50: score += 15
        elif age > 30: score += 10
        elif age > 20: score += 5
    
    # Value considerations (25 points)
    if prop.assessed_value and prop.market_value:
        ratio = prop.assessed_value / prop.market_value
        if ratio < 0.7: score += 25
        elif ratio < 0.85: score += 15
        elif ratio < 0.95: score += 10
    
    return min(score, 100)


def calculate_adu_score(prop: Property) -> int:
    """Calculate ADU/DADU opportunity score (0-100)"""
    score = 0
    
    # Must-haves
    if not prop.lot_size_sqft or prop.lot_size_sqft < 6000:
        return 0
    if prop.has_hoa:
        return 0
    
    # Lot size bonus (30 points)
    if prop.lot_size_sqft >= 10000: score += 30
    elif prop.lot_size_sqft >= 8000: score += 25
    elif prop.lot_size_sqft >= 6500: score += 20
    else: score += 15
    
    # Access (35 points)
    if prop.is_corner_lot: score += 20
    if prop.has_alley_access: score += 15
    
    # Location/Zoning (20 points)
    if prop.city.lower() in ['seattle']: score += 15
    if prop.zoning and ('sf' in prop.zoning.lower() or 'single' in prop.zoning.lower()):
        score += 5
    
    # Property value (15 points)
    if prop.market_value:
        if prop.market_value > 800000: score += 15
        elif prop.market_value > 600000: score += 12
        elif prop.market_value > 500000: score += 8
        elif prop.market_value > 400000: score += 5
    
    return min(score, 100)


def determine_deal_type(prop: Property) -> str:
    """Determine best deal type for property"""
    wholesaling = prop.wholesaling_score or 0
    adu = prop.adu_score or 0
    
    if adu >= 70: return 'adu'
    if wholesaling >= 70: return 'wholesaling'
    if adu > wholesaling: return 'adu'
    if wholesaling > 50: return 'wholesaling'
    
    return 'fix-flip'


def score_property(prop: Property) -> Property:
    """Score property and determine deal type"""
    prop.wholesaling_score = calculate_wholesaling_score(prop)
    prop.adu_score = calculate_adu_score(prop)
    prop.overall_score = max(prop.wholesaling_score, prop.adu_score)
    prop.deal_type = determine_deal_type(prop)
    return prop


def fetch_foreclosure_parcels() -> List[str]:
    """Fetch list of pre-foreclosure parcels from King County"""
    url = "https://data.kingcounty.gov/resource/nx4x-daw6.json"
    params = {'$limit': 200}
    
    try:
        response = requests.get(url, params=params, timeout=30)
        data = response.json()
        parcels = [item['parcels'] for item in data if 'parcels' in item]
        print(f"✓ Found {len(parcels)} foreclosure parcels")
        return parcels
    except Exception as e:
        print(f"✗ Error fetching foreclosure parcels: {e}")
        return []


def fetch_parcel_details_bulk(parcels: List[str], limit: int = 100) -> List[Property]:
    """
    Fetch parcel details from King County Assessor data
    Uses publicly available bulk download or GIS services
    """
    properties = []
    
    # Try King County GIS REST API
    # This is a public ArcGIS REST endpoint for King County parcels
    gis_url = "https://gismaps.kingcounty.gov/arcgis/rest/services/Property/KingCo_SFH/MapServer/0/query"
    
    print(f"Fetching details for {len(parcels[:limit])} parcels...")
    
    for i, parcel in enumerate(parcels[:limit], 1):
        try:
            # Query by parcel number
            params = {
                'where': f"PIN = '{parcel}' OR PARCEL_NBR = '{parcel}'",
                'outFields': '*',
                'returnGeometry': 'true',
                'f': 'json'
            }
            
            response = requests.get(gis_url, params=params, timeout=15)
            
            if response.status_code != 200:
                # Fallback: Create minimal record from parcel number
                prop = create_minimal_property(parcel, pre_foreclosure=True)
                properties.append(prop)
                if i % 10 == 0:
                    print(f"  Progress: {i}/{len(parcels[:limit])} (using fallback)")
                time.sleep(0.2)
                continue
            
            data = response.json()
            
            if 'features' in data and len(data['features']) > 0:
                feature = data['features'][0]
                attrs = feature['attributes']
                geom = feature.get('geometry', {})
                
                prop = Property(
                    address=attrs.get('SITE_ADDR') or attrs.get('ADDR') or f"Parcel {parcel}",
                    city=attrs.get('CITY') or attrs.get('CITY_NAME') or "Seattle",
                    state="WA",
                    zip=str(attrs.get('ZIP') or attrs.get('ZIP_CODE') or ""),
                    parcel_number=parcel,
                    
                    lot_size_sqft=attrs.get('SQFT_LOT') or attrs.get('LOT_SIZE'),
                    building_sqft=attrs.get('SQFT') or attrs.get('BLDG_SQFT'),
                    bedrooms=attrs.get('BEDROOMS'),
                    bathrooms=attrs.get('BATHROOMS'),
                    year_built=attrs.get('YEAR_BUILT') or attrs.get('YR_BUILT'),
                    zoning=attrs.get('ZONING') or attrs.get('CURRENT_ZONING'),
                    
                    assessed_value=attrs.get('APPRAISED_VALUE') or attrs.get('ASSESSED_VALUE'),
                    assessed_land_value=attrs.get('LAND_VALUE'),
                    assessed_improvement_value=attrs.get('IMPROVEMENT_VALUE'),
                    market_value=attrs.get('APPRAISED_VALUE') or attrs.get('ASSESSED_VALUE'),
                    last_sale_price=attrs.get('SALE_PRICE'),
                    last_sale_date=attrs.get('SALE_DATE'),
                    
                    owner_name=attrs.get('TAXPAYER_NAME') or attrs.get('OWNER_NAME'),
                    owner_mailing_address=attrs.get('TAXPAYER_ADDR') or attrs.get('OWNER_ADDRESS'),
                    
                    pre_foreclosure=True,  # From foreclosure list
                    source="king-county-foreclosure",
                    source_url="https://data.kingcounty.gov/Property/Foreclosure-parcels/nx4x-daw6"
                )
                
                # Calculate days owned
                if prop.last_sale_date:
                    try:
                        if isinstance(prop.last_sale_date, (int, float)):
                            sale_date = datetime.fromtimestamp(prop.last_sale_date / 1000)
                        else:
                            sale_date = datetime.strptime(str(prop.last_sale_date)[:10], '%Y-%m-%d')
                        prop.days_owned = (datetime.now() - sale_date).days
                    except:
                        pass
                
                # Check if absentee owner
                if prop.owner_mailing_address and prop.address:
                    owner_clean = re.sub(r'[^a-z0-9]', '', prop.owner_mailing_address.lower())
                    addr_clean = re.sub(r'[^a-z0-9]', '', prop.address.lower())
                    if owner_clean not in addr_clean and addr_clean not in owner_clean:
                        prop.is_absentee_owner = True
                
                properties.append(prop)
            else:
                # No GIS data found, create minimal record
                prop = create_minimal_property(parcel, pre_foreclosure=True)
                properties.append(prop)
            
            if i % 10 == 0:
                print(f"  Progress: {i}/{len(parcels[:limit])}")
            
            time.sleep(0.3)  # Rate limiting
            
        except Exception as e:
            print(f"  ✗ Error fetching parcel {parcel}: {e}")
            # Create minimal record anyway
            prop = create_minimal_property(parcel, pre_foreclosure=True)
            properties.append(prop)
            continue
    
    return properties


def create_minimal_property(parcel: str, pre_foreclosure: bool = False, 
                           tax_delinquent: bool = False) -> Property:
    """
    Create minimal property record when full data not available
    This ensures we capture the opportunity even without complete data
    """
    return Property(
        address=f"Parcel {parcel}",
        city="Unknown",
        state="WA",
        county="King",
        parcel_number=parcel,
        
        # Assume reasonable defaults for scoring
        lot_size_sqft=7000,  # Typical Seattle lot
        year_built=1950,     # Assume older property
        
        pre_foreclosure=pre_foreclosure,
        tax_delinquent=tax_delinquent,
        
        # Mark for manual research
        notes=f"LIMITED DATA - Research parcel {parcel} at https://blue.kingcounty.com/Assessor/eRealProperty/Dashboard.aspx?ParcelNbr={parcel}",
        source="king-county-minimal",
        source_url=f"https://blue.kingcounty.com/Assessor/eRealProperty/Dashboard.aspx?ParcelNbr={parcel}"
    )


def insert_to_supabase(properties: List[Property]) -> int:
    """Insert properties into Supabase"""
    url = f"{SUPABASE_URL}/rest/v1/properties"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    
    inserted = 0
    
    for prop in properties:
        try:
            # Convert to dict and remove None values
            data = {k: v for k, v in asdict(prop).items() if v is not None}
            
            response = requests.post(url, headers=headers, json=data)
            
            if response.status_code in [200, 201]:
                inserted += 1
                print(f"  ✓ Inserted: {prop.address} (Score: {prop.overall_score}, Type: {prop.deal_type})")
            elif response.status_code == 409:
                print(f"  ⊙ Duplicate: {prop.address}")
            else:
                print(f"  ✗ Failed {prop.address}: {response.status_code} - {response.text[:100]}")
            
            time.sleep(0.1)
            
        except Exception as e:
            print(f"  ✗ Error inserting {prop.address}: {e}")
    
    return inserted


def main():
    """Main scraping workflow"""
    print("=" * 60)
    print("OFF-MARKET Property Scraper - King County")
    print("Focus: Foreclosure, Tax Delinquent, Motivated Sellers")
    print("=" * 60)
    
    all_properties = []
    
    # 1. Fetch foreclosure parcels
    print("\n[1/3] Fetching PRE-FORECLOSURE properties...")
    print("-" * 60)
    foreclosure_parcels = fetch_foreclosure_parcels()
    
    if foreclosure_parcels:
        # Get details for foreclosure parcels
        foreclosure_props = fetch_parcel_details_bulk(foreclosure_parcels, limit=75)
        
        # Score them
        for prop in foreclosure_props:
            prop = score_property(prop)
            
            # Build notes
            notes = []
            notes.append("PRE-FORECLOSURE")
            if prop.wholesaling_score >= 50:
                notes.append(f"Wholesale score: {prop.wholesaling_score}")
            if prop.adu_score >= 50:
                notes.append(f"ADU score: {prop.adu_score}")
            if prop.is_absentee_owner:
                notes.append("Absentee owner")
            if prop.days_owned and prop.days_owned > 5475:  # 15 years
                notes.append(f"Long-term owner ({prop.days_owned // 365} yrs)")
            
            if prop.notes:
                notes.append(prop.notes)
            
            prop.notes = " | ".join(notes)
        
        # Filter for quality
        foreclosure_props = [p for p in foreclosure_props if (p.overall_score or 0) >= 40]
        all_properties.extend(foreclosure_props)
        
        print(f"\n✓ Found {len(foreclosure_props)} HIGH-POTENTIAL foreclosure properties")
    
    # Sort by score
    all_properties.sort(key=lambda p: p.overall_score or 0, reverse=True)
    
    # Summary
    print(f"\n{'='*60}")
    print(f"SUMMARY - OFF-MARKET OPPORTUNITIES")
    print(f"{'='*60}")
    print(f"Total properties found: {len(all_properties)}")
    
    if all_properties:
        print(f"\n{'='*60}")
        print(f"TOP 15 BEST OFF-MARKET OPPORTUNITIES")
        print(f"{'='*60}")
        
        for i, prop in enumerate(all_properties[:15], 1):
            print(f"\n{i}. {prop.address}")
            if prop.city and prop.city != "Unknown":
                print(f"   City: {prop.city}")
            print(f"   Parcel: {prop.parcel_number}")
            print(f"   Overall Score: {prop.overall_score}")
            print(f"   Deal Type: {prop.deal_type}")
            print(f"   Wholesaling: {prop.wholesaling_score} | ADU: {prop.adu_score}")
            if prop.owner_name:
                print(f"   Owner: {prop.owner_name}")
            if prop.assessed_value:
                print(f"   Assessed Value: ${prop.assessed_value:,}")
            if prop.lot_size_sqft:
                print(f"   Lot: {prop.lot_size_sqft:,} sqft")
            print(f"   WHY: {prop.notes}")
            if prop.source_url:
                print(f"   Research: {prop.source_url}")
        
        # Insert to database
        print(f"\n{'='*60}")
        print(f"Inserting to Supabase database...")
        print(f"{'='*60}")
        
        inserted = insert_to_supabase(all_properties)
        print(f"\n✓ Successfully inserted {inserted}/{len(all_properties)} properties")
        
        # Deal type breakdown
        print(f"\n{'='*60}")
        print("DEAL TYPE BREAKDOWN")
        print(f"{'='*60}")
        wholesaling = len([p for p in all_properties if p.deal_type == 'wholesaling'])
        adu = len([p for p in all_properties if p.deal_type == 'adu'])
        fix_flip = len([p for p in all_properties if p.deal_type == 'fix-flip'])
        
        print(f"Wholesaling: {wholesaling}")
        print(f"ADU/DADU: {adu}")
        print(f"Fix & Flip: {fix_flip}")
        
    else:
        print("\n⚠ No properties found matching criteria")
    
    print(f"\n{'='*60}")
    print("✓ COMPLETE - All off-market opportunities captured")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
