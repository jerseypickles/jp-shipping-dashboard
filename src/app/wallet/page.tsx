'use client'

import { useState, useEffect } from 'react'
import { 
  Receipt, 
  RefreshCw, 
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  ChevronRight,
  Plus,
  X,
  Loader2,
  Package,
  Fuel,
  Calculator
} from 'lucide-react'
import { getCurrentBillingWeek, getBillingHistory, enterUPSInvoice, markWeekPaid, getBillingWeekDetail } from '@/lib/api'

interface CurrentWeek {
  week: {
    start: string;
    end: string;
    label: string;
    daysRemaining: number;
    daysElapsed: number;
  };
  tracked: {
    labelCount: number;
    baseCost: number;
    baseCostFormatted: string;
    estimatedFuel: number;
    estimatedFuelFormatted: string;
    totalEstimated: number;
    totalEstimatedFormatted: string;
    avgPerLabelFormatted: string;
    projectedLabels: number;
    projectedTotal: number;
  };
  byService: { service: string; count: number; costFormatted: string }[];
  byZone: { zone: string; count: number; costFormatted: string }[];
  invoice: any;
  variance: any;
  status: string;
}

interface WeekHistory {
  _id: string;
  weekLabel: string;
  weekStart: string;
  tracked: { labelCount: number; totalEstimatedFormatted: string };
  invoice: { invoiceNumber: string; totalBilledFormatted: string } | null;
  variance: { amountFormatted: string; percentage: number; status: string } | null;
  status: string;
}

interface HistorySummary {
  weeksCount: number;
  totalTrackedFormatted: string;
  totalInvoicedFormatted: string;
  totalVarianceFormatted: string;
  avgVariancePercent: number;
}

export default function BillingPage() {
  const [currentWeek, setCurrentWeek] = useState<CurrentWeek | null>(null)
  const [history, setHistory] = useState<WeekHistory[]>([])
  const [summary, setSummary] = useState<HistorySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Invoice entry modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null)
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    baseCharges: '',
    fuelSurcharge: '',
    residentialSurcharge: '',
    otherCharges: '',
    adjustments: '',
    totalBilled: ''
  })
  const [submitting, setSubmitting] = useState(false)

  async function loadData() {
    setLoading(true)
    setError(null)
    
    try {
      const [currentData, historyData] = await Promise.all([
        getCurrentBillingWeek(),
        getBillingHistory(12)
      ])
      
      setCurrentWeek(currentData)
      setHistory(historyData.weeks || [])
      setSummary(historyData.summary || null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function openInvoiceModal(weekId?: string) {
    setSelectedWeekId(weekId || null)
    setInvoiceForm({
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      baseCharges: '',
      fuelSurcharge: '',
      residentialSurcharge: '',
      otherCharges: '',
      adjustments: '',
      totalBilled: ''
    })
    setShowInvoiceModal(true)
  }

  async function handleSubmitInvoice() {
    setSubmitting(true)
    setError(null)
    
    try {
      await enterUPSInvoice({
        weekId: selectedWeekId || undefined,
        invoiceNumber: invoiceForm.invoiceNumber,
        invoiceDate: invoiceForm.invoiceDate,
        dueDate: invoiceForm.dueDate || undefined,
        baseCharges: parseFloat(invoiceForm.baseCharges) || 0,
        fuelSurcharge: parseFloat(invoiceForm.fuelSurcharge) || 0,
        residentialSurcharge: parseFloat(invoiceForm.residentialSurcharge) || 0,
        otherCharges: parseFloat(invoiceForm.otherCharges) || 0,
        adjustments: parseFloat(invoiceForm.adjustments) || 0,
        totalBilled: parseFloat(invoiceForm.totalBilled) || 0
      })
      
      setShowInvoiceModal(false)
      await loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Calculate total from form fields
  function calculateTotal() {
    const base = parseFloat(invoiceForm.baseCharges) || 0
    const fuel = parseFloat(invoiceForm.fuelSurcharge) || 0
    const residential = parseFloat(invoiceForm.residentialSurcharge) || 0
    const other = parseFloat(invoiceForm.otherCharges) || 0
    const adj = parseFloat(invoiceForm.adjustments) || 0
    return (base + fuel + residential + other + adj).toFixed(2)
  }

  const varianceColors: Record<string, string> = {
    matched: 'text-green-600 bg-green-100',
    over: 'text-red-600 bg-red-100',
    under: 'text-blue-600 bg-blue-100',
    pending: 'text-gray-600 bg-gray-100'
  }

  const statusColors: Record<string, string> = {
    open: 'text-yellow-600 bg-yellow-100',
    invoice_received: 'text-blue-600 bg-blue-100',
    paid: 'text-green-600 bg-green-100',
    disputed: 'text-red-600 bg-red-100'
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Billing</h1>
          <p className="text-gray-500 mt-1">Track UPS invoices vs your shipping costs</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openInvoiceModal()}
            className="flex items-center gap-2 px-4 py-2 bg-pickle-600 text-white rounded-lg hover:bg-pickle-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Enter Invoice
          </button>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Current Week Card */}
      {currentWeek && (
        <div className="bg-gradient-to-r from-pickle-600 to-pickle-700 rounded-xl p-6 text-white mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-5 h-5 text-pickle-200" />
                <span className="text-pickle-100 font-medium">Current Billing Week</span>
              </div>
              <h2 className="text-2xl font-bold">{currentWeek.week.label}</h2>
            </div>
            <div className="text-right">
              <div className="text-pickle-200 text-sm">
                {currentWeek.week.daysRemaining > 0 
                  ? `${currentWeek.week.daysRemaining} days remaining`
                  : 'Week complete'}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-6 h-2 rounded-full ${
                      i < currentWeek.week.daysElapsed ? 'bg-white' : 'bg-pickle-500'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-pickle-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-pickle-200 text-sm mb-1">
                <Package className="w-4 h-4" />
                Labels
              </div>
              <p className="text-3xl font-bold">{currentWeek.tracked.labelCount}</p>
            </div>
            
            <div className="bg-pickle-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-pickle-200 text-sm mb-1">
                <DollarSign className="w-4 h-4" />
                Base Cost
              </div>
              <p className="text-3xl font-bold">{currentWeek.tracked.baseCostFormatted}</p>
            </div>
            
            <div className="bg-pickle-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-pickle-200 text-sm mb-1">
                <Fuel className="w-4 h-4" />
                Est. Fuel (~8%)
              </div>
              <p className="text-3xl font-bold">{currentWeek.tracked.estimatedFuelFormatted}</p>
            </div>
            
            <div className="bg-white/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-pickle-100 text-sm mb-1">
                <Receipt className="w-4 h-4" />
                Projected Invoice
              </div>
              <p className="text-3xl font-bold">{currentWeek.tracked.totalEstimatedFormatted}</p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-pickle-500 flex items-center justify-between text-sm">
            <span className="text-pickle-200">
              Avg per label: {currentWeek.tracked.avgPerLabelFormatted}
            </span>
            {currentWeek.tracked.projectedTotal > 0 && currentWeek.week.daysRemaining > 0 && (
              <span className="text-pickle-200">
                If pace continues: ~{currentWeek.tracked.projectedLabels} labels, ~${(currentWeek.tracked.projectedTotal / 100).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Breakdown Cards */}
      {currentWeek && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* By Service */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">This Week by Service</h3>
            <div className="space-y-3">
              {currentWeek.byService.map((s) => (
                <div key={s.service} className="flex items-center justify-between">
                  <span className="text-gray-700">{s.service || 'Unknown'}</span>
                  <div className="text-right">
                    <span className="font-medium text-gray-900">{s.count} labels</span>
                    <span className="text-gray-500 text-sm ml-2">{s.costFormatted}</span>
                  </div>
                </div>
              ))}
              {currentWeek.byService.length === 0 && (
                <p className="text-gray-500 text-sm">No shipments yet</p>
              )}
            </div>
          </div>
          
          {/* By Zone */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">This Week by Zone</h3>
            <div className="space-y-3">
              {currentWeek.byZone.map((z) => (
                <div key={z.zone} className="flex items-center justify-between">
                  <span className="text-gray-700">Zone {z.zone}</span>
                  <div className="text-right">
                    <span className="font-medium text-gray-900">{z.count} labels</span>
                    <span className="text-gray-500 text-sm ml-2">{z.costFormatted}</span>
                  </div>
                </div>
              ))}
              {currentWeek.byZone.length === 0 && (
                <p className="text-gray-500 text-sm">No shipments yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-gray-500 text-sm">Total Tracked ({summary.weeksCount} weeks)</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalTrackedFormatted}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-gray-500 text-sm">Total Invoiced</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalInvoicedFormatted}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-gray-500 text-sm">Total Variance</p>
            <p className={`text-2xl font-bold ${summary.totalVarianceFormatted.startsWith('+') ? 'text-red-600' : 'text-green-600'}`}>
              {summary.totalVarianceFormatted}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-gray-500 text-sm">Avg Variance</p>
            <p className={`text-2xl font-bold ${summary.avgVariancePercent > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {summary.avgVariancePercent > 0 ? '+' : ''}{summary.avgVariancePercent}%
            </p>
          </div>
        </div>
      )}

      {/* Week History */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Billing History</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Week</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Labels</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Our Tracking</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">UPS Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Variance</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((week) => (
                <tr key={week._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900">{week.weekLabel}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-700">{week.tracked.labelCount}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900">{week.tracked.totalEstimatedFormatted}</span>
                  </td>
                  <td className="px-6 py-4">
                    {week.invoice ? (
                      <div>
                        <span className="font-medium text-gray-900">{week.invoice.totalBilledFormatted}</span>
                        <span className="text-xs text-gray-500 block">{week.invoice.invoiceNumber}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {week.variance ? (
                      <span className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${varianceColors[week.variance.status]}`}>
                        {week.variance.amountFormatted} ({week.variance.percentage}%)
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusColors[week.status]}`}>
                      {week.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!week.invoice && (
                      <button
                        onClick={() => openInvoiceModal(week._id)}
                        className="text-pickle-600 hover:text-pickle-700 text-sm font-medium"
                      >
                        Enter Invoice
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No billing history yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* How UPS Billing Works */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h3 className="font-medium text-blue-900 mb-2">📋 How UPS Weekly Billing Works</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• UPS billing weeks run <strong>Saturday to Friday</strong></li>
          <li>• Invoices are generated on <strong>Saturday</strong> for the previous week</li>
          <li>• Our tracking shows the base cost; actual invoice includes fuel surcharge (~8-12%) and any adjustments</li>
          <li>• <strong>Variance</strong> shows how much UPS charged vs what we calculated (positive = UPS charged more)</li>
          <li>• If variance is consistently high, check for weight corrections or other surcharges</li>
        </ul>
      </div>

      {/* Invoice Entry Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Enter UPS Invoice</h2>
              <button onClick={() => setShowInvoiceModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number *</label>
                  <input
                    type="text"
                    value={invoiceForm.invoiceNumber}
                    onChange={(e) => setInvoiceForm({...invoiceForm, invoiceNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
                    placeholder="0000-XXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceForm.invoiceDate}
                    onChange={(e) => setInvoiceForm({...invoiceForm, invoiceDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
                  />
                </div>
              </div>
              
              <div className="border-t border-gray-100 pt-4">
                <h3 className="font-medium text-gray-900 mb-3">Charges from Invoice</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Charges ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={invoiceForm.baseCharges}
                      onChange={(e) => setInvoiceForm({...invoiceForm, baseCharges: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Surcharge ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={invoiceForm.fuelSurcharge}
                      onChange={(e) => setInvoiceForm({...invoiceForm, fuelSurcharge: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Residential Surcharge ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={invoiceForm.residentialSurcharge}
                      onChange={(e) => setInvoiceForm({...invoiceForm, residentialSurcharge: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Other Charges ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={invoiceForm.otherCharges}
                      onChange={(e) => setInvoiceForm({...invoiceForm, otherCharges: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adjustments ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={invoiceForm.adjustments}
                      onChange={(e) => setInvoiceForm({...invoiceForm, adjustments: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Weight corrections, disputes, etc.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Calculated Total
                    </label>
                    <div className="px-3 py-2 bg-gray-100 rounded-lg font-mono text-gray-700">
                      ${calculateTotal()}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-100 pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Billed (from invoice) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={invoiceForm.totalBilled}
                      onChange={(e) => setInvoiceForm({...invoiceForm, totalBilled: e.target.value})}
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500 text-lg font-semibold"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Enter the exact total from your UPS invoice</p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitInvoice}
                disabled={submitting || !invoiceForm.invoiceNumber || !invoiceForm.totalBilled}
                className="flex items-center gap-2 px-4 py-2 bg-pickle-600 text-white rounded-lg hover:bg-pickle-700 transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Save Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}