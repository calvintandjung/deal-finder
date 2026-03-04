import { Property } from './types/database'

/**
 * Calculate wholesaling score (0-100)
 * Higher scores indicate better wholesaling opportunities
 */
export function calculateWholesalingScore(property: Property): number {
  let score = 0
  
  // Distress indicators (40 points total)
  if (property.tax_delinquent) score += 10
  if (property.pre_foreclosure) score += 12
  if (property.estate_sale) score += 8
  if (property.divorce_filing) score += 5
  if (property.vacant) score += 5
  if (property.is_absentee_owner) score += 8
  if (property.code_violations > 0) score += Math.min(property.code_violations * 2, 10)
  
  // Days owned (20 points)
  if (property.days_owned) {
    if (property.days_owned > 10 * 365) score += 20 // Long-term owner
    else if (property.days_owned > 5 * 365) score += 15
    else if (property.days_owned > 2 * 365) score += 10
  }
  
  // Property age (15 points) - older properties may need more work
  if (property.year_built) {
    const age = new Date().getFullYear() - property.year_built
    if (age > 50) score += 15
    else if (age > 30) score += 10
    else if (age > 20) score += 5
  }
  
  // Value considerations (25 points)
  if (property.assessed_value && property.market_value) {
    const ratio = property.assessed_value / property.market_value
    if (ratio < 0.7) score += 25 // Undervalued
    else if (ratio < 0.85) score += 15
    else if (ratio < 0.95) score += 10
  }
  
  return Math.min(score, 100)
}

/**
 * Calculate ADU/DADU opportunity score (0-100)
 * Higher scores indicate better ADU development potential
 */
export function calculateADUScore(property: Property): number {
  let score = 0
  
  // Must-haves (return 0 if not met)
  if (!property.lot_size_sqft || property.lot_size_sqft < 6000) return 0
  if (property.has_hoa) return 0 // HOAs typically prohibit ADUs
  
  // Lot size bonus (30 points)
  if (property.lot_size_sqft >= 10000) score += 30
  else if (property.lot_size_sqft >= 8000) score += 25
  else if (property.lot_size_sqft >= 6500) score += 20
  else score += 15
  
  // Access (35 points)
  if (property.is_corner_lot) score += 20
  if (property.has_alley_access) score += 15
  
  // Location/Zoning (20 points)
  if (property.city.toLowerCase().includes('seattle')) score += 15 // Seattle has favorable ADU laws
  if (property.zoning?.toLowerCase().includes('sf') || property.zoning?.toLowerCase().includes('single')) score += 5
  
  // Property value (15 points) - Higher value areas = better ADU rental returns
  if (property.market_value) {
    if (property.market_value > 800000) score += 15
    else if (property.market_value > 600000) score += 12
    else if (property.market_value > 500000) score += 8
    else if (property.market_value > 400000) score += 5
  }
  
  return Math.min(score, 100)
}

/**
 * Calculate overall property score
 */
export function calculateOverallScore(property: Property): number {
  const wholesalingScore = calculateWholesalingScore(property)
  const aduScore = calculateADUScore(property)
  
  // Take the maximum of the two strategies
  return Math.max(wholesalingScore, aduScore)
}

/**
 * Determine best deal type for property
 */
export function determineDealType(property: Property): string {
  const wholesalingScore = calculateWholesalingScore(property)
  const aduScore = calculateADUScore(property)
  
  if (aduScore >= 70) return 'adu'
  if (wholesalingScore >= 70) return 'wholesaling'
  if (aduScore > wholesalingScore) return 'adu'
  if (wholesalingScore > 50) return 'wholesaling'
  
  return 'fix-flip' // Default
}

/**
 * Calculate ARV (After Repair Value) estimate
 */
export function calculateARV(
  property: Property,
  comps: Array<{ sale_price: number; price_per_sqft?: number }>
): number {
  if (comps.length === 0 || !property.building_sqft) {
    return property.market_value || property.assessed_value || 0
  }
  
  // Average price per sqft from comps
  const avgPricePerSqft = comps.reduce((sum, comp) => {
    if (comp.price_per_sqft) return sum + comp.price_per_sqft
    return sum + (comp.sale_price / (property.building_sqft || 1))
  }, 0) / comps.length
  
  return Math.round(avgPricePerSqft * property.building_sqft)
}

/**
 * Calculate maximum allowable offer (MAO) for wholesaling
 * Formula: ARV × 0.70 - Estimated Repairs - Wholesale Fee
 */
export function calculateMAO(
  arv: number,
  estimatedRepairs: number = 30000,
  wholesaleFee: number = 10000
): number {
  return Math.round(arv * 0.70 - estimatedRepairs - wholesaleFee)
}

/**
 * Calculate ADU build proforma
 */
export interface ADUProforma {
  purchasePrice: number
  aduBuildCost: number
  totalInvestment: number
  currentValue: number
  projectedValue: number
  equity: number
  monthlyRentMain: number
  monthlyRentADU: number
  totalMonthlyIncome: number
  monthlyExpenses: number
  monthlyCashFlow: number
  annualCashFlow: number
  cashOnCashReturn: number
  capRate: number
}

export function calculateADUProforma(
  purchasePrice: number,
  currentValue: number,
  lotSize: number,
  city: string
): ADUProforma {
  // ADU build costs (Seattle area estimates)
  const aduBuildCost = city.toLowerCase().includes('seattle') ? 200000 : 180000
  const totalInvestment = purchasePrice + aduBuildCost
  
  // Projected value increase
  const projectedValue = currentValue + (aduBuildCost * 0.75) // ADUs typically add 75% of build cost to value
  const equity = projectedValue - totalInvestment
  
  // Rental income estimates (Seattle area)
  const monthlyRentMain = Math.round(currentValue * 0.005) // 0.5% of value as monthly rent
  const monthlyRentADU = city.toLowerCase().includes('seattle') ? 1800 : 1500
  const totalMonthlyIncome = monthlyRentMain + monthlyRentADU
  
  // Expenses (25% of gross income is typical)
  const monthlyExpenses = Math.round(totalMonthlyIncome * 0.25)
  const monthlyCashFlow = totalMonthlyIncome - monthlyExpenses
  const annualCashFlow = monthlyCashFlow * 12
  
  // Returns
  const cashOnCashReturn = (annualCashFlow / totalInvestment) * 100
  const capRate = (annualCashFlow / projectedValue) * 100
  
  return {
    purchasePrice,
    aduBuildCost,
    totalInvestment,
    currentValue,
    projectedValue,
    equity,
    monthlyRentMain,
    monthlyRentADU,
    totalMonthlyIncome,
    monthlyExpenses,
    monthlyCashFlow,
    annualCashFlow,
    cashOnCashReturn,
    capRate,
  }
}
