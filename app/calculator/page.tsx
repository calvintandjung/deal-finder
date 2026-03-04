'use client'

import { useState } from 'react'
import { Calculator, DollarSign, Home, TrendingUp } from 'lucide-react'
import { calculateADUProforma, calculateMAO } from '@/lib/scoring'

export default function CalculatorPage() {
  const [calculatorType, setCalculatorType] = useState<'wholesaling' | 'adu'>('wholesaling')
  
  // Wholesaling inputs
  const [arv, setArv] = useState('')
  const [repairs, setRepairs] = useState('30000')
  const [wholesaleFee, setWholesaleFee] = useState('10000')
  
  // ADU inputs
  const [purchasePrice, setPurchasePrice] = useState('')
  const [currentValue, setCurrentValue] = useState('')
  const [lotSize, setLotSize] = useState('')
  const [city, setCity] = useState('Seattle')
  
  // Calculate results
  const mao = arv ? calculateMAO(
    parseFloat(arv),
    parseFloat(repairs) || 30000,
    parseFloat(wholesaleFee) || 10000
  ) : 0
  
  const aduProforma = (purchasePrice && currentValue && lotSize) 
    ? calculateADUProforma(
        parseFloat(purchasePrice),
        parseFloat(currentValue),
        parseFloat(lotSize),
        city
      )
    : null
  
  return (
    <div className="px-4 sm:px-0">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deal Calculator</h1>
          <p className="mt-2 text-sm text-gray-700">
            Analyze wholesaling and ADU opportunities
          </p>
        </div>
      </div>

      {/* Calculator Type Selector */}
      <div className="mt-6 bg-white shadow rounded-lg p-4">
        <div className="flex gap-4">
          <button
            onClick={() => setCalculatorType('wholesaling')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              calculatorType === 'wholesaling'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Calculator className="w-5 h-5 mx-auto mb-1" />
            Wholesaling Calculator
          </button>
          <button
            onClick={() => setCalculatorType('adu')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              calculatorType === 'adu'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Home className="w-5 h-5 mx-auto mb-1" />
            ADU/DADU Calculator
          </button>
        </div>
      </div>

      {/* Wholesaling Calculator */}
      {calculatorType === 'wholesaling' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Inputs</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  After Repair Value (ARV)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                  <input
                    type="number"
                    value={arv}
                    onChange={(e) => setArv(e.target.value)}
                    placeholder="500000"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Repairs
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                  <input
                    type="number"
                    value={repairs}
                    onChange={(e) => setRepairs(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wholesale Fee
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                  <input
                    type="number"
                    value={wholesaleFee}
                    onChange={(e) => setWholesaleFee(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Formula</h3>
              <p className="text-sm text-blue-800">
                MAO = (ARV × 70%) - Repairs - Wholesale Fee
              </p>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Results</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-900">
                    Maximum Allowable Offer (MAO)
                  </span>
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <p className="mt-2 text-3xl font-bold text-green-900">
                  ${mao.toLocaleString()}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">ARV × 70%</span>
                  <span className="text-sm font-medium text-gray-900">
                    ${arv ? (parseFloat(arv) * 0.7).toLocaleString() : '0'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Less: Repairs</span>
                  <span className="text-sm font-medium text-red-600">
                    -${repairs ? parseFloat(repairs).toLocaleString() : '0'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Less: Wholesale Fee</span>
                  <span className="text-sm font-medium text-red-600">
                    -${wholesaleFee ? parseFloat(wholesaleFee).toLocaleString() : '0'}
                  </span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-900 mb-2">
                  💡 Wholesaling Tips
                </h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Offer 10-15% below MAO for negotiation room</li>
                  <li>• Target motivated sellers (distressed properties)</li>
                  <li>• Build buyer list before making offers</li>
                  <li>• WA state: Note rescission clause requirements</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADU Calculator */}
      {calculatorType === 'adu' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Inputs</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                  <input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="700000"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Market Value
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                  <input
                    type="number"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    placeholder="750000"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lot Size (sq ft)
                </label>
                <input
                  type="number"
                  value={lotSize}
                  onChange={(e) => setLotSize(e.target.value)}
                  placeholder="6500"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 p-4 bg-purple-50 rounded-lg">
              <h3 className="text-sm font-medium text-purple-900 mb-2">ADU Requirements</h3>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>✓ Lot size: 6,000+ sq ft</li>
                <li>✓ Corner lot or alley access preferred</li>
                <li>✓ No HOA restrictions</li>
                <li>✓ City has ADU-friendly zoning</li>
              </ul>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Proforma</h2>
            
            {aduProforma ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 mb-1">ADU Build Cost</p>
                    <p className="text-xl font-bold text-blue-900">
                      ${aduProforma.aduBuildCost.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600 mb-1">Total Investment</p>
                    <p className="text-xl font-bold text-green-900">
                      ${aduProforma.totalInvestment.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-900">
                      Projected Value
                    </span>
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-3xl font-bold text-purple-900">
                    ${aduProforma.projectedValue.toLocaleString()}
                  </p>
                  <p className="text-sm text-purple-700 mt-1">
                    Equity: ${aduProforma.equity.toLocaleString()}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-900">Monthly Income</h3>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-sm text-gray-600">Main House Rent</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${aduProforma.monthlyRentMain.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-sm text-gray-600">ADU Rent</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${aduProforma.monthlyRentADU.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-sm text-gray-600">Total Income</span>
                    <span className="text-sm font-medium text-green-600">
                      ${aduProforma.totalMonthlyIncome.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-sm text-gray-600">Expenses (25%)</span>
                    <span className="text-sm font-medium text-red-600">
                      -${aduProforma.monthlyExpenses.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 bg-green-50 px-3 rounded">
                    <span className="text-sm font-semibold text-green-900">Cash Flow</span>
                    <span className="text-sm font-bold text-green-900">
                      ${aduProforma.monthlyCashFlow.toLocaleString()}/mo
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="p-3 bg-yellow-50 rounded-lg text-center">
                    <p className="text-xs text-yellow-600 mb-1">Cash-on-Cash Return</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {aduProforma.cashOnCashReturn.toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <p className="text-xs text-blue-600 mb-1">Cap Rate</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {aduProforma.capRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Home className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Enter property details to see ADU proforma</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
