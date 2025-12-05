'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  RefreshCw, 
  TrendingUp,
  Package,
  DollarSign,
  MapPin,
  Truck,
  Loader2
} from 'lucide-react'
import { getShippingAnalytics, getWalletAnalytics } from '@/lib/api'

interface Analytics {
  period: { startDate: string; endDate: string };
  summary: {
    totalLabels: number;
    totalCost: number;
    totalCostFormatted: string;
    avgCostPerLabel: number;
    avgCostFormatted: string;
    avgWeight: number;
    projectedInvoice: number;
    projectedInvoiceFormatted: string;
  };
  byZone: { zone: number; count: number; totalCost: number; avgCost: number; percentage: number }[];
  byService: { service: string; count: number; totalCost: number; avgCost: number }[];
  topStates: { state: string; count: number; totalCost: number }[];
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(7)

  async function loadAnalytics() {
    setLoading(true)
    setError(null)
    
    try {
      const endDate = new Date().toISOString()
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      
      const data = await getShippingAnalytics(startDate, endDate)
      setAnalytics(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [days])

  const periods = [
    { value: 7, label: '7 Days' },
    { value: 14, label: '14 Days' },
    { value: 30, label: '30 Days' },
  ]

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipping Analytics</h1>
          <p className="text-gray-500 mt-1">Analyze your shipping costs and patterns</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setDays(p.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  days === p.value
                    ? 'bg-pickle-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={loadAnalytics}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {analytics && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-gray-500 font-medium">Total Labels</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{analytics.summary.totalLabels}</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-gray-500 font-medium">Total Spent</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{analytics.summary.totalCostFormatted}</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-gray-500 font-medium">Avg. per Label</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{analytics.summary.avgCostFormatted}</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-gray-500 font-medium">Projected Invoice</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{analytics.summary.projectedInvoiceFormatted}</p>
              <p className="text-xs text-gray-500 mt-1">Includes ~8% fuel surcharge</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Zone */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Cost by Zone</h2>
              <div className="space-y-4">
                {analytics.byZone.map((zone) => (
                  <div key={zone.zone} className="flex items-center gap-4">
                    <div className="w-16 text-sm font-medium text-gray-600">Zone {zone.zone}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">{zone.count} labels</span>
                        <span className="text-sm font-medium text-gray-900">
                          ${(zone.totalCost / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-pickle-500 h-2 rounded-full"
                          style={{ width: `${zone.percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-12 text-right text-sm text-gray-500">{zone.percentage}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* By Service */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">By Service</h2>
              <div className="space-y-3">
                {analytics.byService.map((service) => (
                  <div key={service.service} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5 text-gray-400" />
                      <span className="font-medium text-gray-900">{service.service}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{service.count} labels</p>
                      <p className="text-sm text-gray-500">
                        Avg: ${(service.avgCost / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top States */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Destinations</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {analytics.topStates.map((state, i) => (
                  <div key={state.state} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="font-bold text-gray-900">{state.state}</span>
                    </div>
                    <p className="text-2xl font-bold text-pickle-600">{state.count}</p>
                    <p className="text-xs text-gray-500">labels</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
