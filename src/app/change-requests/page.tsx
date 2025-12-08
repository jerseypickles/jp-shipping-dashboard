'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  FileEdit,
  RefreshCw,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Mail,
  AlertTriangle,
  Loader2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Package,
  MapPin,
  CreditCard,
  RotateCcw,
  X,
  Ban,
  PlayCircle,
  TrendingDown,
  TrendingUp,
  ShoppingCart,
  Eye,
  Truck
} from 'lucide-react'

interface ChangeRequest {
  _id: string
  orderNumber: string
  shopifyOrderId: string
  type: 'address' | 'package' | 'both'
  customer: {
    name: string
    email: string
  }
  originalAddress: {
    name?: string
    street1: string
    street2?: string
    city: string
    state: string
    zip: string
  }
  newAddress: {
    name?: string
    street1: string
    street2?: string
    city: string
    state: string
    zip: string
  }
  originalPackage: {
    weight: number
    length: number
    width: number
    height: number
  }
  newPackage: {
    weight: number
    length: number
    width: number
    height: number
  }
  costs: {
    customerPaid: number
    originalRate?: number
    newRate: number
    additionalCost: number
  }
  status: 'pending' | 'invoice_sent' | 'paid' | 'applied' | 'cancelled' | 'expired'
  shopify?: {
    draftOrderId?: string
    draftOrderNumber?: string
    draftOrderName?: string
    invoiceUrl?: string
    completedOrderId?: string
    completedOrderNumber?: string
  }
  notifications?: {
    reminderCount?: number
    lastReminderAt?: string
  }
  createdAt: string
  invoiceSentAt?: string
  paidAt?: string
  appliedAt?: string
  expiresAt?: string
  daysPending?: number
  notes?: string
}

interface Stats {
  pending: { count: number; amount: number; amountFormatted: string }
  invoice_sent: { count: number; amount: number; amountFormatted: string }
  paid: { count: number; amount: number; amountFormatted: string }
  applied: { count: number; amount: number; amountFormatted: string }
  cancelled: { count: number; amount: number }
  expired: { count: number; amount: number }
  pendingRevenue: number
  pendingRevenueFormatted: string
  collected: number
  collectedFormatted: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

export default function ChangeRequestsPage() {
  const [requests, setRequests] = useState<ChangeRequest[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('actionable')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Actions
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [checkingPayment, setCheckingPayment] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)
    
    try {
      const [requestsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/change-requests?status=${statusFilter}&limit=100`),
        fetch(`${API_BASE}/api/change-requests/stats`)
      ])
      
      if (!requestsRes.ok) throw new Error('Failed to load requests')
      if (!statsRes.ok) throw new Error('Failed to load stats')
      
      const requestsData = await requestsRes.json()
      const statsData = await statsRes.json()
      
      setRequests(requestsData.requests || [])
      setStats(statsData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [statusFilter])

  // Filter requests by search
  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests
    
    const query = searchQuery.toLowerCase()
    return requests.filter(r => 
      r.orderNumber.toLowerCase().includes(query) ||
      r.customer.name?.toLowerCase().includes(query) ||
      r.customer.email?.toLowerCase().includes(query) ||
      r.shopify?.draftOrderNumber?.toLowerCase().includes(query)
    )
  }, [requests, searchQuery])

  // Actions
  async function sendInvoice(id: string) {
    setProcessingId(id)
    setError(null)
    
    try {
      const res = await fetch(`${API_BASE}/api/change-requests/${id}/send-invoice`, {
        method: 'POST'
      })
      
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to send invoice')
      
      setSuccess(`✅ Shopify Draft Order created and invoice sent to customer!`)
      loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  async function resendInvoice(id: string) {
    setProcessingId(id)
    setError(null)
    
    try {
      const res = await fetch(`${API_BASE}/api/change-requests/${id}/resend`, {
        method: 'POST'
      })
      
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to resend')
      
      setSuccess(`✅ Invoice resent! (Reminder #${data.reminderCount})`)
      loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  async function checkPaymentStatus(id: string) {
    setCheckingPayment(id)
    setError(null)
    
    try {
      const res = await fetch(`${API_BASE}/api/change-requests/check-draft-status/${id}`)
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to check status')
      
      if (data.paid) {
        setSuccess(`✅ Payment confirmed! ${data.completedOrder || ''} Ready to apply changes.`)
        loadData()
      } else {
        setSuccess(`⏳ Payment not yet received. Draft order status: ${data.draftStatus || 'OPEN'}`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCheckingPayment(null)
    }
  }

  async function markPaid(id: string) {
    if (!confirm('Mark this request as paid? Only use this if payment was received outside of Shopify.')) {
      return
    }
    
    setProcessingId(id)
    setError(null)
    
    try {
      const res = await fetch(`${API_BASE}/api/change-requests/${id}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: 'manual' })
      })
      
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to mark as paid')
      
      setSuccess(`✅ Marked as paid. Ready to apply changes.`)
      loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  async function applyChanges(id: string) {
    setProcessingId(id)
    setError(null)
    
    try {
      const res = await fetch(`${API_BASE}/api/change-requests/${id}/apply`, {
        method: 'POST'
      })
      
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to apply changes')
      
      setSuccess(`✅ Changes applied for order ${data.request.orderNumber}. Ready to ship!`)
      loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  async function cancelRequest(id: string) {
    const reason = prompt('Reason for cancellation (optional):')
    if (reason === null) return
    
    setProcessingId(id)
    setError(null)
    
    try {
      const res = await fetch(`${API_BASE}/api/change-requests/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })
      
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to cancel')
      
      setSuccess(`Request cancelled.`)
      loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  function copyToClipboard(text: string, label: string = 'Copied!') {
    navigator.clipboard.writeText(text)
    setSuccess(label)
    setTimeout(() => setSuccess(null), 2000)
  }

  function getStatusBadge(status: string, request: ChangeRequest) {
    switch (status) {
      case 'pending':
        return (
          <div className="flex flex-col items-start gap-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
              <Clock className="w-3.5 h-3.5" /> Pending
            </span>
          </div>
        )
      case 'invoice_sent':
        return (
          <div className="flex flex-col items-start gap-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              <Mail className="w-3.5 h-3.5" /> Invoice Sent
            </span>
            {request.notifications?.reminderCount && request.notifications.reminderCount > 0 && (
              <span className="text-[10px] text-blue-500">
                {request.notifications.reminderCount} reminder{request.notifications.reminderCount > 1 ? 's' : ''} sent
              </span>
            )}
          </div>
        )
      case 'paid':
        return (
          <div className="flex flex-col items-start gap-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 animate-pulse">
              <CreditCard className="w-3.5 h-3.5" /> Paid ✓
            </span>
            <span className="text-[10px] text-green-600 font-medium">Ready to apply!</span>
          </div>
        )
      case 'applied':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
            <CheckCircle className="w-3.5 h-3.5" /> Applied
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        )
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
            <AlertTriangle className="w-3.5 h-3.5" /> Expired
          </span>
        )
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>
    }
  }

  function getTypeDisplay(type: string) {
    switch (type) {
      case 'address':
        return (
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Address</span>
          </div>
        )
      case 'package':
        return (
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-100 rounded-lg">
              <Package className="w-4 h-4 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Package</span>
          </div>
        )
      case 'both':
        return (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <div className="p-1.5 bg-orange-100 rounded-lg -ml-1">
                <Package className="w-4 h-4 text-orange-600" />
              </div>
            </div>
            <span className="text-sm font-medium text-gray-700">Both</span>
          </div>
        )
      default:
        return <span className="text-sm text-gray-500">{type}</span>
    }
  }

  // Calculate business impact
  function getBusinessImpact(request: ChangeRequest) {
    const customerPaid = request.costs.customerPaid
    const originalRate = request.costs.originalRate
    const additionalCost = request.costs.additionalCost
    
    // Original margin (if we have the rate)
    const originalMargin = originalRate ? customerPaid - originalRate : null
    
    // After customer pays additional, we break even on shipping increase
    // but lose our original margin
    const marginLost = originalMargin !== null ? originalMargin : 0
    
    return {
      originalMargin,
      marginLost,
      customerPaysExtra: additionalCost,
      breakEven: additionalCost > 0
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Change Requests</h1>
          <p className="text-gray-500 mt-1">
            Manage address changes that require additional payment via Shopify
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div 
            className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
              statusFilter === 'pending' ? 'border-gray-400 ring-2 ring-gray-200' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setStatusFilter('pending')}
          >
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Clock className="w-4 h-4" />
              Pending
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.pending.count}</div>
            <div className="text-sm text-gray-500">{stats.pending.amountFormatted}</div>
          </div>
          
          <div 
            className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
              statusFilter === 'invoice_sent' ? 'border-blue-400 ring-2 ring-blue-100' : 'border-blue-200 hover:border-blue-300'
            }`}
            onClick={() => setStatusFilter('invoice_sent')}
          >
            <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
              <Mail className="w-4 h-4" />
              Awaiting Payment
            </div>
            <div className="text-2xl font-bold text-blue-700">{stats.invoice_sent.count}</div>
            <div className="text-sm text-blue-500">{stats.invoice_sent.amountFormatted}</div>
          </div>
          
          <div 
            className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
              statusFilter === 'paid' ? 'border-green-400 ring-2 ring-green-100' : 'border-green-200 hover:border-green-300'
            }`}
            onClick={() => setStatusFilter('paid')}
          >
            <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
              <CreditCard className="w-4 h-4" />
              Paid - Action Needed
            </div>
            <div className="text-2xl font-bold text-green-700">{stats.paid.count}</div>
            <div className="text-sm text-green-500">{stats.paid.amountFormatted}</div>
          </div>
          
          <div 
            className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
              statusFilter === 'applied' ? 'border-purple-400 ring-2 ring-purple-100' : 'border-purple-200 hover:border-purple-300'
            }`}
            onClick={() => setStatusFilter('applied')}
          >
            <div className="flex items-center gap-2 text-purple-600 text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              Completed
            </div>
            <div className="text-2xl font-bold text-purple-700">{stats.applied.count}</div>
            <div className="text-sm text-purple-500">{stats.applied.amountFormatted}</div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200 p-4">
            <div className="flex items-center gap-2 text-amber-700 text-sm mb-1">
              <DollarSign className="w-4 h-4" />
              Pending Revenue
            </div>
            <div className="text-2xl font-bold text-amber-800">{stats.pendingRevenueFormatted}</div>
            <div className="text-sm text-amber-600">{stats.pending.count + stats.invoice_sent.count} awaiting</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-4">
            <div className="flex items-center gap-2 text-green-700 text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              Total Collected
            </div>
            <div className="text-2xl font-bold text-green-800">{stats.collectedFormatted}</div>
            <div className="text-sm text-green-600">{stats.paid.count + stats.applied.count} orders</div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <span className="text-green-700">{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order #, customer, draft order..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pickle-500 bg-white"
          >
            <option value="actionable">⚡ Needs Action</option>
            <option value="">📋 All Requests</option>
            <option value="pending">⏳ Pending</option>
            <option value="invoice_sent">📧 Invoice Sent</option>
            <option value="paid">💰 Paid (Ready)</option>
            <option value="applied">✅ Applied</option>
            <option value="cancelled">❌ Cancelled</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
            <p className="mt-4 text-gray-500">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <FileEdit className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No change requests</h3>
            <p className="mt-2 text-gray-500">
              {statusFilter ? 'No requests match this filter' : 'Change requests appear when you edit order addresses'}
            </p>
            {statusFilter && (
              <button
                onClick={() => setStatusFilter('')}
                className="mt-4 text-pickle-600 hover:text-pickle-700 font-medium"
              >
                View all requests →
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-10"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      Amount
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Age</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRequests.map((request) => {
                  const isExpanded = expandedId === request._id
                  const impact = getBusinessImpact(request)
                  
                  return (
                    <>
                      <tr 
                        key={request._id} 
                        className={`hover:bg-gray-50 transition-colors ${
                          request.status === 'paid' ? 'bg-green-50/50' : ''
                        }`}
                      >
                        <td className="px-4 py-4">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : request._id)}
                            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-600" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-gray-900 text-lg">#{request.orderNumber}</div>
                          {request.shopify?.draftOrderNumber && (
                            <div className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                              <ShoppingCart className="w-3 h-3" />
                              {request.shopify.draftOrderNumber}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {getTypeDisplay(request.type)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900">{request.customer.name}</div>
                          <div className="text-xs text-gray-500">{request.customer.email}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-xl font-bold text-red-600">
                            ${(request.costs.additionalCost / 100).toFixed(2)}
                          </div>
                          {impact.originalMargin !== null && (
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              Margin loss: <span className="text-red-500 font-medium">-${(impact.marginLost / 100).toFixed(2)}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {getStatusBadge(request.status, request)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900">
                            {request.daysPending !== undefined ? (
                              <span className={request.daysPending > 3 ? 'text-orange-600 font-medium' : ''}>
                                {request.daysPending === 0 ? 'Today' : `${request.daysPending}d ago`}
                              </span>
                            ) : (
                              new Date(request.createdAt).toLocaleDateString()
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* PENDING: Send Invoice */}
                            {request.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => sendInvoice(request._id)}
                                  disabled={processingId === request._id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                  {processingId === request._id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Send className="w-3.5 h-3.5" />
                                  )}
                                  Send Invoice
                                </button>
                                <button
                                  onClick={() => cancelRequest(request._id)}
                                  disabled={processingId === request._id}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Cancel request"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            
                            {/* INVOICE SENT: Check, Resend, Copy, Manual Pay, Cancel */}
                            {request.status === 'invoice_sent' && (
                              <>
                                <button
                                  onClick={() => checkPaymentStatus(request._id)}
                                  disabled={checkingPayment === request._id}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                                  title="Check if payment received"
                                >
                                  {checkingPayment === request._id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5" />
                                  )}
                                  Check
                                </button>
                                <button
                                  onClick={() => resendInvoice(request._id)}
                                  disabled={processingId === request._id}
                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Resend invoice email"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                                {request.shopify?.invoiceUrl && (
                                  <>
                                    <a
                                      href={request.shopify.invoiceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                      title="Open checkout"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                    <button
                                      onClick={() => copyToClipboard(request.shopify!.invoiceUrl!, 'Checkout link copied!')}
                                      className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                      title="Copy checkout link"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => markPaid(request._id)}
                                  disabled={processingId === request._id}
                                  className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Mark as paid manually"
                                >
                                  <CreditCard className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => cancelRequest(request._id)}
                                  disabled={processingId === request._id}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Cancel"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            
                            {/* PAID: Apply Changes */}
                            {request.status === 'paid' && (
                              <button
                                onClick={() => applyChanges(request._id)}
                                disabled={processingId === request._id}
                                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
                              >
                                {processingId === request._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <PlayCircle className="w-4 h-4" />
                                )}
                                Apply Changes
                              </button>
                            )}
                            
                            {/* COMPLETED STATES */}
                            {request.status === 'applied' && (
                              <span className="flex items-center gap-1.5 text-sm text-purple-600">
                                <Truck className="w-4 h-4" />
                                Ready to ship
                              </span>
                            )}
                            
                            {request.status === 'cancelled' && (
                              <span className="text-sm text-gray-400">Cancelled</span>
                            )}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr className="bg-gray-50">
                          <td colSpan={8} className="px-4 py-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              
                              {/* Address Change */}
                              {(request.type === 'address' || request.type === 'both') && (
                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <div className="p-1.5 bg-blue-100 rounded-lg">
                                      <MapPin className="w-4 h-4 text-blue-600" />
                                    </div>
                                    Address Change
                                  </h4>
                                  <div className="space-y-4">
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                      <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 font-semibold">Original</div>
                                      <div className="text-sm text-gray-600">
                                        {request.originalAddress.street1}<br />
                                        {request.originalAddress.street2 && <>{request.originalAddress.street2}<br /></>}
                                        {request.originalAddress.city}, {request.originalAddress.state} {request.originalAddress.zip}
                                      </div>
                                    </div>
                                    <div className="flex justify-center">
                                      <div className="p-1 bg-green-100 rounded-full">
                                        <ChevronDown className="w-4 h-4 text-green-600" />
                                      </div>
                                    </div>
                                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                      <div className="text-[10px] text-green-600 uppercase tracking-wide mb-1 font-semibold">New Address</div>
                                      <div className="text-sm text-green-800 font-medium">
                                        {request.newAddress.street1}<br />
                                        {request.newAddress.street2 && <>{request.newAddress.street2}<br /></>}
                                        {request.newAddress.city}, {request.newAddress.state} {request.newAddress.zip}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Cost Analysis */}
                              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                  <div className="p-1.5 bg-green-100 rounded-lg">
                                    <DollarSign className="w-4 h-4 text-green-600" />
                                  </div>
                                  Cost Breakdown
                                </h4>
                                
                                {/* Customer View */}
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mb-3">
                                  <div className="text-[10px] text-blue-600 uppercase tracking-wide mb-2 font-semibold">👤 Customer</div>
                                  <div className="space-y-1.5 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Originally paid:</span>
                                      <span className="font-medium">${(request.costs.customerPaid / 100).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Additional charge:</span>
                                      <span className="font-bold text-red-600">+${(request.costs.additionalCost / 100).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between pt-1.5 border-t border-blue-200">
                                      <span className="font-medium text-gray-700">Total:</span>
                                      <span className="font-bold text-gray-900">${((request.costs.customerPaid + request.costs.additionalCost) / 100).toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Business View */}
                                <div className="p-3 bg-gray-100 rounded-lg">
                                  <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-2 font-semibold">📊 Your Cost</div>
                                  <div className="space-y-1.5 text-sm">
                                    {request.costs.originalRate && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Original UPS rate:</span>
                                        <span className="font-medium">${(request.costs.originalRate / 100).toFixed(2)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">New UPS rate:</span>
                                      <span className="font-medium text-blue-600">${(request.costs.newRate / 100).toFixed(2)}</span>
                                    </div>
                                    {impact.originalMargin !== null && (
                                      <div className="flex justify-between pt-1.5 border-t border-gray-200">
                                        <span className="text-gray-700">Margin lost:</span>
                                        <span className={`font-bold flex items-center gap-1 ${impact.marginLost > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                          {impact.marginLost > 0 ? (
                                            <><TrendingDown className="w-3.5 h-3.5" /> -${(impact.marginLost / 100).toFixed(2)}</>
                                          ) : (
                                            <><TrendingUp className="w-3.5 h-3.5" /> $0.00</>
                                          )}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {impact.marginLost > 0 && (
                                  <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-xs text-amber-800">
                                      💡 Customer pays the shipping increase, but you lose your original profit margin of <strong>${(impact.marginLost / 100).toFixed(2)}</strong>
                                    </p>
                                  </div>
                                )}
                              </div>
                              
                              {/* Shopify Draft Order */}
                              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                  <div className="p-1.5 bg-purple-100 rounded-lg">
                                    <ShoppingCart className="w-4 h-4 text-purple-600" />
                                  </div>
                                  Shopify Draft Order
                                </h4>
                                
                                {request.shopify?.draftOrderNumber ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                      <span className="text-sm text-gray-600">Draft Order:</span>
                                      <span className="font-bold text-gray-900">{request.shopify.draftOrderNumber}</span>
                                    </div>
                                    
                                    {request.shopify.completedOrderNumber && (
                                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                        <span className="text-sm text-green-700">Completed Order:</span>
                                        <span className="font-bold text-green-800 flex items-center gap-1">
                                          <CheckCircle className="w-4 h-4" />
                                          {request.shopify.completedOrderNumber}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {request.shopify.invoiceUrl && (
                                      <div className="space-y-2">
                                        <div className="text-xs text-gray-500 font-medium">Checkout Link:</div>
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="text"
                                            value={request.shopify.invoiceUrl}
                                            readOnly
                                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 truncate"
                                          />
                                          <button
                                            onClick={() => copyToClipboard(request.shopify!.invoiceUrl!, 'Link copied!')}
                                            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                          >
                                            <Copy className="w-4 h-4 text-gray-600" />
                                          </button>
                                          <a
                                            href={request.shopify.invoiceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                                          >
                                            <ExternalLink className="w-4 h-4 text-purple-600" />
                                          </a>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                                    <p className="text-sm text-gray-500">
                                      {request.status === 'pending' 
                                        ? 'Draft order will be created when you send the invoice'
                                        : 'No draft order associated'
                                      }
                                    </p>
                                  </div>
                                )}
                                
                                {/* Timeline */}
                                {(request.invoiceSentAt || request.paidAt || request.appliedAt) && (
                                  <div className="mt-4 pt-4 border-t border-gray-100">
                                    <div className="text-xs text-gray-500 font-medium mb-2">Timeline:</div>
                                    <div className="space-y-1.5 text-xs">
                                      <div className="flex items-center gap-2 text-gray-600">
                                        <Clock className="w-3 h-3" />
                                        Created: {new Date(request.createdAt).toLocaleString()}
                                      </div>
                                      {request.invoiceSentAt && (
                                        <div className="flex items-center gap-2 text-blue-600">
                                          <Mail className="w-3 h-3" />
                                          Invoice sent: {new Date(request.invoiceSentAt).toLocaleString()}
                                        </div>
                                      )}
                                      {request.paidAt && (
                                        <div className="flex items-center gap-2 text-green-600">
                                          <CreditCard className="w-3 h-3" />
                                          Paid: {new Date(request.paidAt).toLocaleString()}
                                        </div>
                                      )}
                                      {request.appliedAt && (
                                        <div className="flex items-center gap-2 text-purple-600">
                                          <CheckCircle className="w-3 h-3" />
                                          Applied: {new Date(request.appliedAt).toLocaleString()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
        <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          How Change Requests Work
        </h4>
        <div className="grid md:grid-cols-5 gap-4 text-sm">
          <div className="flex flex-col items-center text-center p-3 bg-white rounded-lg">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mb-2 text-gray-600 font-bold">1</div>
            <div className="text-gray-700">Edit order address in Orders page</div>
          </div>
          <div className="flex flex-col items-center text-center p-3 bg-white rounded-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-2 text-blue-600 font-bold">2</div>
            <div className="text-gray-700">Click <strong>Send Invoice</strong> → Creates Shopify Draft Order</div>
          </div>
          <div className="flex flex-col items-center text-center p-3 bg-white rounded-lg">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mb-2 text-purple-600 font-bold">3</div>
            <div className="text-gray-700">Customer receives email with payment link</div>
          </div>
          <div className="flex flex-col items-center text-center p-3 bg-white rounded-lg">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mb-2 text-green-600 font-bold">4</div>
            <div className="text-gray-700">Customer pays via Shopify checkout</div>
          </div>
          <div className="flex flex-col items-center text-center p-3 bg-white rounded-lg">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mb-2 text-purple-600 font-bold">5</div>
            <div className="text-gray-700">Click <strong>Apply Changes</strong> → Ready to ship!</div>
          </div>
        </div>
        <p className="mt-4 text-sm text-blue-700 bg-blue-100 p-3 rounded-lg">
          <strong>⚠️ Important:</strong> Orders with pending change requests are blocked from shipping until payment is received and changes are applied.
        </p>
      </div>
    </div>
  )
}