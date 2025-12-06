'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  RefreshCw, 
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  MapPin,
  Truck,
  Loader2,
  Scale,
  Calendar,
  Clock,
  Gift,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { getShippingAnalytics } from '@/lib/api'

interface Analytics {
  period: { startDate: string; endDate: string; days: number };
  summary: {
    totalLabels: number;
    labelsPerDay: number;
    totalCost: number;
    totalCostFormatted: string;
    avgCostPerLabel: number;
    avgCostFormatted: string;
    minCostFormatted: string;
    maxCostFormatted: string;
    totalCustomerPaid: number;
    totalCustomerPaidFormatted: string;
    totalProfit: number;
    totalProfitFormatted: string;
    profitPerLabel: number;
    profitPerLabelFormatted: string;
    profitMargin: number;
    avgWeight: number;
    projectedInvoice: number;
    projectedInvoiceFormatted: string;
  };
  freeShipping: {
    count: number;
    percentage: number;
    totalCostFormatted: string;
    avgCostFormatted: string;
  };
  paidShipping: {
    count: number;
    percentage: number;
    totalCostFormatted: string;
  };
  dailyData: {
    date: string;
    labels: number;
    cost: number;
    costFormatted: string;
    profit: number;
  }[];
  byState: {
    state: string;
    count: number;
    percentage: number;
    totalCostFormatted: string;
    profitFormatted: string;
    profitPerLabelFormatted: string;
    profit: number;
  }[];
  byZone: {
    zone: string | number;
    count: number;
    percentage: number;
    avgCostFormatted: string;
    profitFormatted: string;
  }[];
  byService: {
    service: string;
    count: number;
    avgCostFormatted: string;
  }[];
  byWeight: {
    range: string;
    count: number;
    avgCostFormatted: string;
  }[];
  byShippingMethod: {
    method: string;
    count: number;
    totalPaidFormatted: string;
    profitFormatted: string;
    profit: number;
  }[];
  byStatus: {
    status: string;
    count: number;
  }[];
  deliveryStats: {
    avgDays: number;
    minDays: number;
    maxDays: number;
  } | null;
  byDayOfWeek: {
    day: string;
    count: number;
  }[];
}

function StatCard({ icon: Icon, label, value, subValue, trend, color = 'blue' }: {
  icon: any;
  label: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | null;
  color?: string;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    pink: 'bg-pink-100 text-pink-600',
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>
            {trend === 'up' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
          </span>
        )}
      </div>
      <p className="text-gray-500 text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)

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
    { value: 90, label: '90 Days' },
  ]

  // Get max for chart scaling
  const maxDailyLabels = analytics?.dailyData ? Math.max(...analytics.dailyData.map(d => d.labels)) : 0;

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
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipping Analytics</h1>
          <p className="text-gray-500 mt-1">
            {analytics?.period.days} days • {analytics?.summary.totalLabels || 0} labels shipped
          </p>
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
          {/* Main Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <StatCard 
              icon={Package} 
              label="Total Labels" 
              value={analytics.summary.totalLabels.toString()}
              subValue={`${analytics.summary.labelsPerDay}/day avg`}
              color="blue"
            />
            <StatCard 
              icon={DollarSign} 
              label="Shipping Cost" 
              value={analytics.summary.totalCostFormatted}
              subValue={`Avg: ${analytics.summary.avgCostFormatted}`}
              color="orange"
            />
            <StatCard 
              icon={DollarSign} 
              label="Customer Paid" 
              value={analytics.summary.totalCustomerPaidFormatted}
              color="blue"
            />
            <StatCard 
              icon={analytics.summary.totalProfit >= 0 ? TrendingUp : TrendingDown} 
              label="Shipping Profit" 
              value={analytics.summary.totalProfitFormatted}
              subValue={`${analytics.summary.profitMargin}% margin`}
              trend={analytics.summary.totalProfit >= 0 ? 'up' : 'down'}
              color={analytics.summary.totalProfit >= 0 ? 'green' : 'red'}
            />
            <StatCard 
              icon={Gift} 
              label="Free Shipping" 
              value={`${analytics.freeShipping.count}`}
              subValue={`${analytics.freeShipping.percentage}% • Cost: ${analytics.freeShipping.totalCostFormatted}`}
              color="pink"
            />
            <StatCard 
              icon={BarChart3} 
              label="Projected Invoice" 
              value={analytics.summary.projectedInvoiceFormatted}
              subValue="Includes ~8% fuel"
              color="purple"
            />
          </div>

          {/* Profit Alert */}
          {analytics.summary.totalProfit < 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-3">
                <TrendingDown className="w-6 h-6 text-red-500" />
                <div>
                  <h3 className="font-semibold text-red-800">Shipping is costing you money!</h3>
                  <p className="text-red-600 text-sm">
                    You&apos;re losing {analytics.summary.totalProfitFormatted.replace('-', '')} on shipping. 
                    Consider adjusting shipping rates or offering less free shipping.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Daily Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Shipping Volume</h2>
            <div className="h-48 flex items-end gap-1">
              {analytics.dailyData.map((day, i) => {
                const height = maxDailyLabels > 0 ? (day.labels / maxDailyLabels) * 100 : 0;
                const isProfit = day.profit >= 0;
                return (
                  <div 
                    key={day.date} 
                    className="flex-1 flex flex-col items-center group relative"
                  >
                    <div 
                      className={`w-full rounded-t transition-all ${isProfit ? 'bg-green-500' : 'bg-red-400'} hover:opacity-80`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    <span className="text-xs text-gray-400 mt-1 hidden md:block">
                      {new Date(day.date).getDate()}
                    </span>
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        <div className="font-semibold">{day.date}</div>
                        <div>{day.labels} labels • {day.costFormatted}</div>
                        <div className={isProfit ? 'text-green-300' : 'text-red-300'}>
                          {isProfit ? '+' : ''}{(day.profit / 100).toFixed(2)} profit
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>{analytics.dailyData[0]?.date}</span>
              <span>{analytics.dailyData[analytics.dailyData.length - 1]?.date}</span>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded"></span> Profit day</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded"></span> Loss day</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* By State - Profit Focus */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Profit by State</h2>
              <p className="text-sm text-gray-500 mb-4">Top destinations ranked by profitability</p>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {analytics.byState.map((state, i) => (
                  <div key={state.state} className="flex items-center gap-3">
                    <div className="w-6 text-center">
                      <span className={`text-xs font-bold ${i < 3 ? 'text-pickle-600' : 'text-gray-400'}`}>
                        #{i + 1}
                      </span>
                    </div>
                    <div className="w-10 font-bold text-gray-900">{state.state}</div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{state.count} labels ({state.percentage}%)</span>
                        <span className={`font-semibold ${state.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {state.profitFormatted}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${state.profit >= 0 ? 'bg-green-500' : 'bg-red-400'}`}
                          style={{ width: `${state.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By Zone */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Cost by UPS Zone</h2>
              <p className="text-sm text-gray-500 mb-4">Higher zones = further distance = higher cost</p>
              <div className="space-y-4">
                {analytics.byZone.map((zone) => (
                  <div key={zone.zone} className="flex items-center gap-4">
                    <div className="w-20">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        Zone {zone.zone}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">{zone.count} labels</span>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">Avg: {zone.avgCostFormatted}</span>
                          <span className={`ml-2 text-xs ${zone.profitFormatted.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                            {zone.profitFormatted}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${zone.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Busiest Days */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Busiest Days</h2>
              <div className="space-y-3">
                {analytics.byDayOfWeek
                  .sort((a, b) => b.count - a.count)
                  .map((day, i) => {
                    const maxCount = Math.max(...analytics.byDayOfWeek.map(d => d.count));
                    const percentage = (day.count / maxCount) * 100;
                    return (
                      <div key={day.day} className="flex items-center gap-3">
                        <div className="w-10 font-medium text-gray-900">{day.day}</div>
                        <div className="flex-1">
                          <div className="w-full bg-gray-100 rounded-full h-4">
                            <div
                              className={`h-4 rounded-full ${i === 0 ? 'bg-pickle-500' : 'bg-pickle-300'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-12 text-right text-sm font-medium text-gray-600">
                          {day.count}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Weight Distribution */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Weight Distribution</h2>
              <div className="space-y-3">
                {analytics.byWeight.filter(w => w.count > 0).map((weight) => (
                  <div key={weight.range} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{weight.range}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">{weight.count}</span>
                      <span className="text-xs text-gray-500 ml-2">@ {weight.avgCostFormatted}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Shipping Methods */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Methods</h2>
              <p className="text-xs text-gray-500 mb-3">What customers chose at checkout</p>
              <div className="space-y-3">
                {analytics.byShippingMethod.map((method) => (
                  <div key={method.method} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <div className="font-medium text-gray-900">{method.method || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{method.count} orders</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{method.totalPaidFormatted}</div>
                      <div className={`text-xs font-medium ${method.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {method.profitFormatted}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Label Status</h2>
              <div className="space-y-2">
                {analytics.byStatus.map((status) => {
                  const statusColors: Record<string, string> = {
                    label_created: 'bg-yellow-100 text-yellow-700',
                    printed: 'bg-blue-100 text-blue-700',
                    shipped: 'bg-purple-100 text-purple-700',
                    in_transit: 'bg-orange-100 text-orange-700',
                    delivered: 'bg-green-100 text-green-700',
                    voided: 'bg-gray-100 text-gray-700',
                    exception: 'bg-red-100 text-red-700',
                  };
                  return (
                    <div key={status.status} className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status.status] || 'bg-gray-100'}`}>
                        {status.status.replace('_', ' ')}
                      </span>
                      <span className="font-medium text-gray-900">{status.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Free Shipping Analysis */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Free Shipping Impact</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                  <div>
                    <div className="font-semibold text-pink-800">Free Shipping Orders</div>
                    <div className="text-sm text-pink-600">{analytics.freeShipping.percentage}% of orders</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-pink-800">{analytics.freeShipping.count}</div>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">You absorbed:</span>
                    <span className="font-bold text-red-600">{analytics.freeShipping.totalCostFormatted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg cost per free order:</span>
                    <span className="font-medium text-gray-900">{analytics.freeShipping.avgCostFormatted}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Performance</h2>
              {analytics.deliveryStats ? (
                <div className="space-y-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Clock className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-3xl font-bold text-green-700">{analytics.deliveryStats.avgDays}</div>
                    <div className="text-sm text-green-600">Average delivery days</div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Fastest:</span>
                    <span className="font-medium">{analytics.deliveryStats.minDays} days</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Slowest:</span>
                    <span className="font-medium">{analytics.deliveryStats.maxDays} days</span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p>No delivery data yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Insights */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <h3 className="font-semibold text-blue-800 mb-2">📊 Quick Insights</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Average shipping cost per label: <strong>{analytics.summary.avgCostFormatted}</strong> (range: {analytics.summary.minCostFormatted} - {analytics.summary.maxCostFormatted})</li>
              <li>• Average profit per label: <strong>{analytics.summary.profitPerLabelFormatted}</strong></li>
              <li>• Average package weight: <strong>{analytics.summary.avgWeight} lbs</strong></li>
              {analytics.freeShipping.count > 0 && (
                <li>• Free shipping is costing you <strong>{analytics.freeShipping.totalCostFormatted}</strong> ({analytics.freeShipping.percentage}% of orders)</li>
              )}
              {analytics.byState[0] && (
                <li>• Most shipments go to <strong>{analytics.byState[0].state}</strong> ({analytics.byState[0].count} labels, {analytics.byState[0].percentage}%)</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}