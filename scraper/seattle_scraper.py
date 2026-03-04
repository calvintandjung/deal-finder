#!/usr/bin/env python3
"""
Seattle Area Property Scraper
Scrapes King County property data and scores for investment potential
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
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
    lat: Optional[float] = None
    lng: Optional[float] = None
    
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
    adu_eligible: Optional[bool] = None
    adu_notes: Optional[str] = None
    
    assessed_value: Optional[int] = None
    assessed_land_value: Optional[int] = None
    assessed_improvement_value: Optional[int] = None
    market_value: Optional[int] = None
    last_sale_price: Optional[int] = None
    last_sale_date: Optional[str] = None
    
    owner_name: Optional[str] = None
    owner_mailing_address: Optional[str] = None
    owner_phone: Optional[str] = None
    owner_email: Optional[str] = None
    days_owned: Optional[int] = None
    
    is_absentee_owner: bool = False
    tax_delinquent: bool = False
    pre_foreclosure: bool = False
    estate_sale: bool = False
    divorce_filing: bool = False
    code_violations: int = 0
    vacant: bool = False
    
    wholesaling_score: Optional[int] = None
    adu_score: Optional[int] = None
    overall_score: Optional[int] = None
    deal_type: Optional[str] = None
    
    status: str = "new"
    source: str = "king-county"
    source_url: Optional[str] = None
    notes: Optional[str] = None


def calculate_wholesaling_score(prop: Property) -> int:
    """Calculate wholesaling score (0-100)"""
    score = 0
    
    # Distress indicators (40 points total)
    if prop.tax_delinquent: score += 10
    if prop.pre_foreclosure: score += 12
    if prop.estate_sale: score += 8
    if prop.divorce_filing: score += 5
    if prop.vacant: score += 5
    if prop.is_absentee_owner: score += 8
    if prop.code_violations > 0:
        score += min(prop.code_violations * 2, 10)
    
    # Days owned (20 points)
    if prop.days_owned:
        if prop.days_owned > 10 * 365: score += 20
        elif prop.days_owned > 5 * 365: score += 15
        elif prop.days_owned > 2 * 365: score += 10
    
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


def fetch_king_county_parcels(city: str, limit: int = 100) -> List[Property]:
    """
    Fetch parcel data from King County GIS API
    Uses the public King County Assessor GIS service
    """
    properties = []
    
    # King County Parcel Viewer REST API
    base_url = "https://services.arcgis.com/8ZpVMShClf8U8dae/arcgis/rest/services"
    
    # Try the King County Assessor Parcel dataset
    service_urls = [
        # Assessor parcels with property info
        f"{base_url}/King_County_Parcels_with_Assessor_Data_public/FeatureServer/0/query",
        # Alternative: Basic parcels
        f"{base_url}/King_County_Parcels___Polygon/FeatureServer/0/query"
    ]
    
    for url in service_urls:
        try:
            params = {
                'where': f"CITY_NAME = '{city.upper()}'",
                'outFields': '*',
                'returnGeometry': 'true',
                'f': 'json',
                'resultRecordCount': limit
            }
            
            print(f"Fetching data from King County GIS API for {city}...")
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code != 200:
                print(f"  Failed with status {response.status_code}, trying next endpoint...")
                continue
                
            data = response.json()
            
            if 'features' not in data or len(data['features']) == 0:
                print(f"  No features found, trying next endpoint...")
                continue
            
            print(f"  Found {len(data['features'])} parcels!")
            
            for feature in data['features']:
                attrs = feature['attributes']
                geom = feature.get('geometry', {})
                
                # Extract property details
                prop = Property(
                    address=attrs.get('ADDR_FULL') or attrs.get('SITE_ADDR') or "Unknown",
                    city=city,
                    state="WA",
                    zip=str(attrs.get('ZIP_CODE') or attrs.get('ZIP5') or ""),
                    county="King",
                    parcel_number=attrs.get('PIN') or attrs.get('PARCEL_ID'),
                    
                    # Try to get lat/lng from geometry
                    lat=geom.get('y') if geom else None,
                    lng=geom.get('x') if geom else None,
                    
                    # Property details
                    lot_size_sqft=attrs.get('SQFT_LOT') or attrs.get('LOT_SIZE_SQFT'),
                    building_sqft=attrs.get('SQFT') or attrs.get('SQFT_1') or attrs.get('BLDG_SQFT'),
                    bedrooms=attrs.get('BEDROOMS') or attrs.get('BEDS'),
                    bathrooms=attrs.get('BATHROOMS') or attrs.get('BATHS'),
                    year_built=attrs.get('YEAR_BUILT') or attrs.get('YR_BUILT'),
                    zoning=attrs.get('ZONING') or attrs.get('CURRENT_ZONING'),
                    
                    # Assessed values
                    assessed_value=attrs.get('APPRAISED_VALUE') or attrs.get('ASSESSED_VALUE'),
                    assessed_land_value=attrs.get('LAND_VALUE') or attrs.get('ASSESSED_LAND_VAL'),
                    assessed_improvement_value=attrs.get('IMPROVEMENT_VALUE') or attrs.get('ASSESSED_IMPR_VAL'),
                    
                    # Market value estimate (use assessed as proxy)
                    market_value=attrs.get('APPRAISED_VALUE') or attrs.get('ASSESSED_VALUE'),
                    
                    # Last sale
                    last_sale_price=attrs.get('SALE_PRICE') or attrs.get('LAST_SALE_PRICE'),
                    last_sale_date=attrs.get('SALE_DATE') or attrs.get('LAST_SALE_DATE'),
                    
                    # Owner info
                    owner_name=attrs.get('TAXPAYER_NAME') or attrs.get('OWNER_NAME'),
                    owner_mailing_address=attrs.get('TAXPAYER_ADDR') or attrs.get('OWNER_ADDRESS'),
                    
                    source="king-county-gis",
                    source_url=url
                )
                
                # Calculate days owned
                if prop.last_sale_date:
                    try:
                        # Handle different date formats
                        sale_date_str = str(prop.last_sale_date)
                        if '/' in sale_date_str:
                            sale_date = datetime.strptime(sale_date_str, '%m/%d/%Y')
                        else:
                            # Unix timestamp (milliseconds)
                            sale_date = datetime.fromtimestamp(int(sale_date_str) / 1000)
                        
                        prop.days_owned = (datetime.now() - sale_date).days
                    except:
                        pass
                
                # Check if absentee owner (mailing address different from property)
                if prop.owner_mailing_address and prop.address:
                    # Simple check: if addresses don't match
                    owner_addr_clean = re.sub(r'[^a-z0-9]', '', prop.owner_mailing_address.lower())
                    prop_addr_clean = re.sub(r'[^a-z0-9]', '', prop.address.lower())
                    if owner_addr_clean not in prop_addr_clean and prop_addr_clean not in owner_addr_clean:
                        prop.is_absentee_owner = True
                
                properties.append(prop)
            
            # If we got results, don't try other URLs
            if properties:
                break
                
        except Exception as e:
            print(f"  Error fetching from {url}: {e}")
            continue
    
    return properties


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
                print(f"  ✓ Inserted: {prop.address} (Score: {prop.overall_score})")
            else:
                print(f"  ✗ Failed to insert {prop.address}: {response.text}")
                
            time.sleep(0.1)  # Rate limiting
            
        except Exception as e:
            print(f"  ✗ Error inserting {prop.address}: {e}")
    
    return inserted


def main():
    """Main scraping workflow"""
    print("=" * 60)
    print("Seattle Property Scraper - King County Data")
    print("=" * 60)
    
    cities = ["Seattle", "Bellevue", "Kirkland", "Redmond", "Tacoma", "Renton"]
    all_properties = []
    
    for city in cities:
        print(f"\n{'='*60}")
        print(f"Processing: {city}")
        print(f"{'='*60}")
        
        # Fetch parcels
        properties = fetch_king_county_parcels(city, limit=20)
        
        if not properties:
            print(f"  No properties found for {city}")
            continue
        
        # Score and filter
        scored_properties = []
        for prop in properties:
            prop = score_property(prop)
            
            # Only keep high-potential deals
            if prop.overall_score and prop.overall_score >= 30:
                scored_properties.append(prop)
                
                # Add notes about why it's interesting
                notes = []
                if prop.wholesaling_score >= 50:
                    notes.append(f"Wholesaling score: {prop.wholesaling_score}")
                if prop.adu_score >= 50:
                    notes.append(f"ADU score: {prop.adu_score}")
                if prop.is_absentee_owner:
                    notes.append("Absentee owner")
                if prop.days_owned and prop.days_owned > 3650:
                    notes.append(f"Long-term owner ({prop.days_owned // 365} years)")
                if prop.lot_size_sqft and prop.lot_size_sqft >= 6000:
                    notes.append(f"Large lot ({prop.lot_size_sqft:,} sqft)")
                
                prop.notes = "; ".join(notes)
        
        print(f"\n  Found {len(scored_properties)} high-potential properties (score >= 30)")
        
        # Sort by score
        scored_properties.sort(key=lambda p: p.overall_score or 0, reverse=True)
        
        # Show top 5 for this city
        print(f"\n  Top 5 in {city}:")
        for i, prop in enumerate(scored_properties[:5], 1):
            print(f"    {i}. {prop.address}")
            print(f"       Score: {prop.overall_score} | Type: {prop.deal_type}")
            print(f"       Lot: {prop.lot_size_sqft:,} sqft | Value: ${prop.market_value:,}" if prop.lot_size_sqft and prop.market_value else "")
            print(f"       {prop.notes}")
        
        all_properties.extend(scored_properties)
        time.sleep(1)  # Be nice to the API
    
    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"Total properties scraped: {len(all_properties)}")
    
    if all_properties:
        # Sort all by score
        all_properties.sort(key=lambda p: p.overall_score or 0, reverse=True)
        
        print(f"\n{'='*60}")
        print(f"TOP 10 BEST OPPORTUNITIES")
        print(f"{'='*60}")
        
        for i, prop in enumerate(all_properties[:10], 1):
            print(f"\n{i}. {prop.address}, {prop.city}")
            print(f"   Overall Score: {prop.overall_score}")
            print(f"   Deal Type: {prop.deal_type}")
            print(f"   Wholesaling Score: {prop.wholesaling_score}")
            print(f"   ADU Score: {prop.adu_score}")
            if prop.lot_size_sqft:
                print(f"   Lot Size: {prop.lot_size_sqft:,} sqft")
            if prop.market_value:
                print(f"   Market Value: ${prop.market_value:,}")
            if prop.days_owned:
                print(f"   Years Owned: {prop.days_owned // 365}")
            print(f"   Notes: {prop.notes}")
        
        # Insert to database
        print(f"\n{'='*60}")
        print(f"Inserting to Supabase...")
        print(f"{'='*60}")
        
        inserted = insert_to_supabase(all_properties)
        print(f"\n✓ Successfully inserted {inserted}/{len(all_properties)} properties")
        
    else:
        print("\n⚠ No properties found matching criteria")
    
    print(f"\n{'='*60}")
    print("DONE")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
