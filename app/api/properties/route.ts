import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateWholesalingScore, calculateADUScore, calculateOverallScore, determineDealType } from '@/lib/scoring'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Calculate scores
    const wholesalingScore = calculateWholesalingScore(body)
    const aduScore = calculateADUScore(body)
    const overallScore = calculateOverallScore(body)
    const dealType = determineDealType(body)
    
    // Determine ADU eligibility
    const aduEligible = body.lot_size_sqft >= 6000 && 
                        !body.has_hoa && 
                        (body.is_corner_lot || body.has_alley_access)
    
    // Insert property with calculated scores
    const { data, error } = await supabase
      .from('properties')
      .insert({
        ...body,
        wholesaling_score: wholesalingScore,
        adu_score: aduScore,
        overall_score: overallScore,
        deal_type: dealType,
        adu_eligible: aduEligible,
      })
      .select()
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    let query = supabase.from('properties').select('*')
    
    // Apply filters
    const city = searchParams.get('city')
    const status = searchParams.get('status')
    const dealType = searchParams.get('dealType')
    const aduEligible = searchParams.get('aduEligible')
    const minScore = searchParams.get('minScore')
    
    if (city) query = query.ilike('city', `%${city}%`)
    if (status) query = query.eq('status', status)
    if (dealType) query = query.eq('deal_type', dealType)
    if (aduEligible === 'true') query = query.eq('adu_eligible', true)
    if (minScore) query = query.gte('overall_score', parseInt(minScore))
    
    query = query.order('overall_score', { ascending: false })
    
    const { data, error } = await query
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
