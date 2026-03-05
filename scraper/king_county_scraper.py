#!/usr/bin/env python3
"""
King County Property Scraper
Sources REAL Seattle properties from king_county_owners table
Replaces fake data generation with actual public records
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

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
    
    owner_mailing_address: Optional[str] = None
    
    is_absentee_owner: bool = False
    tax_delinquent: bool = False
    pre_foreclosure: bool = False
    estate_sale: bool = False
    code_violations: int = 0
    vacant: bool = False
    
    wholesaling_score: Optional[int] = None
    overall_score: Optional[int] = None
    deal_type: Optional[str] = None
    
    status: str = "new"
    source: str = ""
    notes: Optional[str] = None


def parse_address(full_address: str) -> tuple[str, str]:
    """Parse King County address format: '7013   GREENWOOD AVE N  98103'"""
    parts = full_address.strip().split()
    
    # Try to extract zip from end
    if parts and parts[-1].isdigit() and len(parts[-1]) == 5:
        zip_code = parts[-1]
        address = ' '.join(parts[:-1]).strip()
        return address, zip_code
    
    return full_address.strip(), ""


def calculate_distress_score(owner: dict) -> int:
    """Calculate distress/motivation score based on King County data"""
    score = 0
    
    # Absentee owner (mailing != property address)
    prop_addr = owner.get('property_address', '').strip().lower()
    mail_addr = owner.get('mailing_address', '').strip().lower()
    is_absentee = prop_addr and mail_addr and prop_addr != mail_addr
    if is_absentee:
        score += 20
    
    # Large lot (ADU/development potential)
    lot_size = owner.get('lot_size_sqft', 0) or 0
    if lot_size >= 6000:
        score += 15
    if lot_size >= 8000:
        score += 10
    
    # Property age (likely needs work)
    year_built = owner.get('year_built', 0) or 0
    if year_built > 0:
        age = datetime.now().year - year_built
        if age > 50:
            score += 15
        elif age > 30:
            score += 10
        elif age > 20:
            score += 5
    
    # Low improvement-to-land ratio (teardown potential)
    land_val = owner.get('assessed_land_value', 0) or 0
    imp_val = owner.get('assessed_improvement_value', 0) or 0
    if land_val > 0 and imp_val > 0:
        ratio = imp_val / land_val
        if ratio < 0.3:
            score += 20
        elif ratio < 0.5:
            score += 10
    
    return score


def fetch_king_county_properties(limit: int = 100) -> List[dict]:
    """Fetch properties from King County table"""
    print(f"🔍 Fetching King County properties...")
    
    # Build query for distressed/interesting properties
    params = {
        'select': '*',
        'district_name': 'eq.SEATTLE',
        'lot_size_sqft': 'gte.4000',
        'year_built': 'gte.1900',
        'limit': limit * 5  # Get more candidates to filter
    }
    
    headers = {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json'
    }
    
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/king_county_owners",
        headers=headers,
        params=params
    )
    
    if response.status_code != 200:
        print(f"❌ Error fetching KC data: {response.status_code}")
        print(response.text)
        return []
    
    owners = response.json()
    print(f"✅ Fetched {len(owners)} candidate properties")
    
    # Score and filter
    scored = [
        {'owner': owner, 'score': calculate_distress_score(owner)}
        for owner in owners
        if owner.get('property_address') and owner.get('mailing_address')
    ]
    
    # Sort by score and take top N
    scored.sort(key=lambda x: x['score'], reverse=True)
    top_properties = scored[:limit]
    
    print(f"✅ Selected top {len(top_properties)} properties (scores: {top_properties[-1]['score']}-{top_properties[0]['score']})")
    
    return [p['owner'] for p in top_properties]


def transform_to_property(owner: dict) -> Property:
    """Transform King County owner record to Property object"""
    address, zip_code = parse_address(owner.get('property_address', ''))
    
    prop_addr = owner.get('property_address', '').strip().lower()
    mail_addr = owner.get('mailing_address', '').strip().lower()
    is_absentee = prop_addr and mail_addr and prop_addr != mail_addr
    
    # Determine deal type
    lot_size = owner.get('lot_size_sqft', 0) or 0
    land_val = owner.get('assessed_land_value', 0) or 0
    imp_val = owner.get('assessed_improvement_value', 0) or 0
    
    deal_type = 'wholesaling'
    if lot_size >= 6000:
        deal_type = 'adu'
    if land_val > 0 and imp_val > 0 and (imp_val / land_val) < 0.3:
        deal_type = 'teardown'
    
    score = calculate_distress_score(owner)
    
    return Property(
        address=address,
        city='Seattle',
        state='WA',
        zip=zip_code or owner.get('zip_code', ''),
        county='King',
        parcel_number=owner.get('parcel_number'),
        
        lot_size_sqft=owner.get('lot_size_sqft'),
        building_sqft=owner.get('building_sqft'),
        bedrooms=owner.get('bedrooms'),
        bathrooms=owner.get('bathrooms'),
        year_built=owner.get('year_built'),
        property_type='single-family',
        
        is_corner_lot=False,
        has_alley_access=False,
        has_hoa=False,
        
        assessed_value=owner.get('total_assessed_value'),
        assessed_land_value=owner.get('assessed_land_value'),
        assessed_improvement_value=owner.get('assessed_improvement_value'),
        
        owner_mailing_address=owner.get('mailing_address'),
        
        is_absentee_owner=is_absentee,
        tax_delinquent=False,
        pre_foreclosure=False,
        estate_sale=False,
        code_violations=0,
        vacant=False,
        
        wholesaling_score=score,
        overall_score=score,
        deal_type=deal_type,
        
        status='new',
        source='king-county-data',
        notes=f"Distress score: {score}. {'Absentee owner. ' if is_absentee else ''}Lot: {lot_size} sqft. Built: {owner.get('year_built')}."
    )


def insert_properties(properties: List[Property]) -> int:
    """Insert properties into database"""
    print(f"\n📝 Inserting {len(properties)} properties...")
    
    headers = {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    # Convert to dicts
    property_dicts = [asdict(prop) for prop in properties]
    
    # Insert in batches of 50
    batch_size = 50
    inserted = 0
    
    for i in range(0, len(property_dicts), batch_size):
        batch = property_dicts[i:i + batch_size]
        
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/properties",
            headers=headers,
            json=batch
        )
        
        if response.status_code in [200, 201]:
            inserted += len(batch)
            print(f"  ✅ Batch {i // batch_size + 1}: {len(batch)} properties")
        else:
            print(f"  ❌ Batch {i // batch_size + 1} failed: {response.status_code}")
            print(f"     {response.text}")
    
    return inserted


def main():
    """Main scraper function"""
    print("=" * 70)
    print("KING COUNTY PROPERTY SCRAPER")
    print("Sources REAL Seattle properties from public records")
    print("=" * 70)
    
    # Fetch properties from King County
    owners = fetch_king_county_properties(limit=100)
    
    if not owners:
        print("❌ No properties found")
        return
    
    # Transform to Property objects
    properties = [transform_to_property(owner) for owner in owners]
    
    # Summary stats
    absentee = sum(1 for p in properties if p.is_absentee_owner)
    adu = sum(1 for p in properties if p.deal_type == 'adu')
    teardown = sum(1 for p in properties if p.deal_type == 'teardown')
    
    print(f"\n📊 Property Breakdown:")
    print(f"  - Total: {len(properties)}")
    print(f"  - Absentee owners: {absentee} ({absentee/len(properties)*100:.1f}%)")
    print(f"  - ADU potential: {adu} ({adu/len(properties)*100:.1f}%)")
    print(f"  - Teardown potential: {teardown} ({teardown/len(properties)*100:.1f}%)")
    
    # Insert into database
    inserted = insert_properties(properties)
    
    print(f"\n✅ Scraper complete!")
    print(f"   Inserted {inserted}/{len(properties)} properties")
    print(f"   All properties are REAL Seattle addresses with King County parcel numbers")


if __name__ == "__main__":
    main()
