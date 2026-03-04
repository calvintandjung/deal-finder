'use client'

import { useState } from 'react'

interface SkipTraceButtonProps {
  propertyId: string
  ownerName: string
  hasContact: boolean
  onSuccess?: (result: any) => void
}

export function SkipTraceButton({ 
  propertyId, 
  ownerName,
  hasContact,
  onSuccess 
}: SkipTraceButtonProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSkipTrace = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/skip-trace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ property_id: propertyId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run skip trace')
      }

      setResult(data.result)
      
      if (data.success && onSuccess) {
        onSuccess(data.result)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (hasContact) {
    return (
      <div className="text-sm text-gray-400">
        ✅ Contact info available
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleSkipTrace}
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            Searching...
          </>
        ) : (
          <>
            🔍 Run Skip Trace
          </>
        )}
      </button>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
          <p className="text-red-400 text-sm">❌ {error}</p>
        </div>
      )}

      {result && (
        <div className={`border rounded-lg p-4 ${
          result.success 
            ? 'bg-green-500/10 border-green-500/50' 
            : 'bg-yellow-500/10 border-yellow-500/50'
        }`}>
          <h4 className={`font-semibold mb-2 ${
            result.success ? 'text-green-400' : 'text-yellow-400'
          }`}>
            {result.success ? '✅ Results Found!' : '⚠️ Limited Results'}
          </h4>

          {result.phone_numbers.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-gray-400">Phone Numbers:</p>
              {result.phone_numbers.map((phone: string, i: number) => (
                <p key={i} className="text-sm font-medium text-white">
                  📞 {phone}
                </p>
              ))}
            </div>
          )}

          {result.email_addresses.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-gray-400">Email Addresses:</p>
              {result.email_addresses.map((email: string, i: number) => (
                <p key={i} className="text-sm font-medium text-white">
                  ✉️ {email}
                </p>
              ))}
            </div>
          )}

          {result.sources_used.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-xs text-gray-400">
                Sources: {result.sources_used.join(', ')}
              </p>
              {result.cost > 0 && (
                <p className="text-xs text-gray-400">
                  Cost: ${result.cost.toFixed(2)}
                </p>
              )}
              <p className="text-xs text-gray-400">
                Confidence: {result.confidence}
              </p>
            </div>
          )}

          {result.notes && (
            <details className="mt-2">
              <summary className="text-xs text-gray-400 cursor-pointer">
                View Details
              </summary>
              <pre className="mt-2 text-xs text-gray-300 whitespace-pre-wrap">
                {result.notes}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Batch Skip Trace Component
 * For processing multiple properties at once
 */

interface BatchSkipTraceProps {
  propertyIds: string[]
  onComplete?: (results: any) => void
}

export function BatchSkipTrace({ propertyIds, onComplete }: BatchSkipTraceProps) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<any>(null)

  const handleBatchSkipTrace = async () => {
    setLoading(true)
    setProgress(0)

    try {
      const response = await fetch('/api/skip-trace/batch', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ property_ids: propertyIds })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run batch skip trace')
      }

      setResults(data)
      setProgress(100)
      
      if (onComplete) {
        onComplete(data)
      }

    } catch (err) {
      console.error('Batch skip trace error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <h3 className="text-lg font-semibold mb-4">🔍 Batch Skip Trace</h3>
      
      <p className="text-sm text-gray-400 mb-4">
        Run skip trace on {propertyIds.length} properties
      </p>

      <button
        onClick={handleBatchSkipTrace}
        disabled={loading || propertyIds.length === 0}
        className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            Processing... {progress}%
          </span>
        ) : (
          `Start Batch Skip Trace (${propertyIds.length} properties)`
        )}
      </button>

      {results && (
        <div className="mt-4 bg-gray-800 rounded-lg p-4">
          <h4 className="font-semibold mb-2 text-green-400">✅ Batch Complete</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Total Processed</p>
              <p className="font-bold text-white">{results.total}</p>
            </div>
            <div>
              <p className="text-gray-400">Successful</p>
              <p className="font-bold text-green-400">{results.successful}</p>
            </div>
            <div>
              <p className="text-gray-400">Failed</p>
              <p className="font-bold text-red-400">{results.failed}</p>
            </div>
            <div>
              <p className="text-gray-400">Total Cost</p>
              <p className="font-bold text-yellow-400">${results.total_cost.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
