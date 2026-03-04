import { NextRequest, NextResponse } from 'next/server'
import { runSkipTrace, saveSkipTraceResults, batchSkipTrace } from '@/lib/skipTrace'
import { createClient } from '@/lib/supabase/client'

/**
 * POST /api/skip-trace
 * Run skip trace for a single property
 * 
 * Body: { property_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { property_id } = await request.json()

    if (!property_id) {
      return NextResponse.json(
        { error: 'property_id is required' },
        { status: 400 }
      )
    }

    // Fetch property details
    const supabase = createClient()
    const { data: property, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', property_id)
      .single()

    if (error || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Check if already has contact info
    if (property.owner_phone || property.owner_email) {
      return NextResponse.json({
        success: true,
        message: 'Property already has contact information',
        phone: property.owner_phone,
        email: property.owner_email
      })
    }

    // Run skip trace
    const skipTraceRequest = {
      property_id,
      owner_name: property.owner_name || 'Unknown',
      property_address: property.address,
      city: property.city,
      state: property.state,
      parcel_number: property.parcel_number
    }

    const result = await runSkipTrace(skipTraceRequest)
    
    // Save results
    await saveSkipTraceResults(property_id, result)

    return NextResponse.json({
      success: result.success,
      result,
      message: result.success 
        ? 'Contact information found!' 
        : 'No contact information found from automated sources'
    })

  } catch (error) {
    console.error('Skip trace error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/skip-trace/batch
 * Run skip trace for multiple properties
 * 
 * Body: { property_ids: string[] }
 */
export async function PUT(request: NextRequest) {
  try {
    const { property_ids } = await request.json()

    if (!property_ids || !Array.isArray(property_ids)) {
      return NextResponse.json(
        { error: 'property_ids array is required' },
        { status: 400 }
      )
    }

    if (property_ids.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 properties per batch' },
        { status: 400 }
      )
    }

    const results = await batchSkipTrace(property_ids)

    // Convert Map to object for JSON serialization
    const resultsObj: Record<string, any> = {}
    results.forEach((value, key) => {
      resultsObj[key] = value
    })

    const successCount = Array.from(results.values()).filter(r => r.success).length
    const totalCost = Array.from(results.values()).reduce((sum, r) => sum + r.cost, 0)

    return NextResponse.json({
      success: true,
      total: property_ids.length,
      successful: successCount,
      failed: property_ids.length - successCount,
      total_cost: totalCost,
      results: resultsObj
    })

  } catch (error) {
    console.error('Batch skip trace error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
