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
  Check,
  X,
  Ban,
  PlayCircle
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
    street1: string
    street2?: string
    city: string
    state: string
    zip: string
  }
  newAddress: {
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
  stripe?: {
    paymentLinkUrl?: string
    paymentLinkId?: string
  }
  notifications?: {
    reminderCount?: number
  }
  createdAt: string
  invoiceSentAt?: string
  paidAt?: string
  appliedAt?: string
  expiresAt?: string
  daysPending?: number
  additionalCostFormatted?: string
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
      r.customer.email?.toLowerCase().includes(query)
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
      
      setSuccess(`✅ Invoice sent! ${data.paymentLinkUrl ? 'Payment link created.' : ''}`)
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

  async function markPaid(id: string) {
    if (!confirm('Mark this request as paid? Only use this if payment was received outside of Stripe.')) {
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
      
      setSuccess(`✅ Changes applied for order ${data.request.orderNumber}. You can now ship with the new address/package.`)
      loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  async function cancelRequest(id: string) {
    const reason = prompt('Reason for cancellation (optional):')
    if (reason === null) return // User clicked cancel
    
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

  function copyPaymentLink(url: string) {
    navigator.clipboard.writeText(url)
    setSuccess('Payment link copied!')
    setTimeout(() => setSuccess(null), 2000)
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"><Clock className="w-3 h-3" /> Pending</span>
      case 'invoice_sent':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"><Mail className="w-3 h-3" /> Invoice Sent</span>
      case 'paid':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CreditCard className="w-3 h-3" /> Paid</span>
      case 'applied':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700"><CheckCircle className="w-3 h-3" /> Applied</span>
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> Cancelled</span>
      case 'expired':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700"><AlertTriangle className="w-3 h-3" /> Expired</span>
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>
    }
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'address':
        return <MapPin className="w-4 h-4 text-blue-500" />
      case 'package':
        return <Package className="w-4 h-4 text-orange-500" />
      case 'both':
        return (
          <div className="flex -space-x-1">
            <MapPin className="w-4 h-4 text-blue-500" />
            <Package className="w-4 h-4 text-orange-500" />
          </div>
        )
      default:
        return <FileEdit className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Change Requests</h1>
          <p className="text-gray-500 mt-1">
            Manage address and package change requests with additional charges
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Clock className="w-4 h-4" />
              Pending
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.pending.count}</div>
            <div className="text-sm text-gray-500">{stats.pending.amountFormatted}</div>
          </div>
          
          <div className="bg-white rounded-xl border border-blue-200 p-4">
            <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
              <Mail className="w-4 h-4" />
              Invoice Sent
            </div>
            <div className="text-2xl font-bold text-blue-700">{stats.invoice_sent.count}</div>
            <div className="text-sm text-blue-500">{stats.invoice_sent.amountFormatted}</div>
          </div>
          
          <div className="bg-white rounded-xl border border-green-200 p-4">
            <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
              <CreditCard className="w-4 h-4" />
              Paid
            </div>
            <div className="text-2xl font-bold text-green-700">{stats.paid.count}</div>
            <div className="text-sm text-green-500">{stats.paid.amountFormatted}</div>
          </div>
          
          <div className="bg-white rounded-xl border border-purple-200 p-4">
            <div className="flex items-center gap-2 text-purple-600 text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              Applied
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
            <div className="text-sm text-amber-600">{stats.pending.count + stats.invoice_sent.count} requests</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-4">
            <div className="flex items-center gap-2 text-green-700 text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              Collected
            </div>
            <div className="text-2xl font-bold text-green-800">{stats.collectedFormatted}</div>
            <div className="text-sm text-green-600">{stats.paid.count + stats.applied.count} paid</div>
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
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order #, customer name, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
          />
        </div>
        
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pickle-500 bg-white"
          >
            <option value="actionable">⚡ Actionable (Pending + Paid)</option>
            <option value="">All Requests</option>
            <option value="pending">⏳ Pending</option>
            <option value="invoice_sent">📧 Invoice Sent</option>
            <option value="paid">💰 Paid (Ready to Apply)</option>
            <option value="applied">✅ Applied</option>
            <option value="cancelled">❌ Cancelled</option>
            <option value="expired">⏰ Expired</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
              {statusFilter ? 'No requests match this filter' : 'No requests have been created yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Created</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <>
                    <tr key={request._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedId(expandedId === request._id ? null : request._id)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            {expandedId === request._id ? (
                              <ChevronUp className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                          <span className="font-semibold text-gray-900">{request.orderNumber}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(request.type)}
                          <span className="text-sm text-gray-600 capitalize">{request.type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">{request.customer.name}</div>
                        <div className="text-xs text-gray-500">{request.customer.email}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-lg font-bold text-red-600">
                          ${(request.costs.additionalCost / 100).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(request.status)}
                        {request.daysPending && request.daysPending > 3 && request.status !== 'paid' && request.status !== 'applied' && (
                          <div className="mt-1 text-xs text-orange-600">
                            {request.daysPending} days pending
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Actions based on status */}
                          {request.status === 'pending' && (
                            <>
                              <button
                                onClick={() => sendInvoice(request._id)}
                                disabled={processingId === request._id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                title="Cancel"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          
                          {request.status === 'invoice_sent' && (
                            <>
                              <button
                                onClick={() => resendInvoice(request._id)}
                                disabled={processingId === request._id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50"
                              >
                                {processingId === request._id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-3.5 h-3.5" />
                                )}
                                Resend
                              </button>
                              {request.stripe?.paymentLinkUrl && (
                                <button
                                  onClick={() => copyPaymentLink(request.stripe!.paymentLinkUrl!)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title="Copy payment link"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => markPaid(request._id)}
                                disabled={processingId === request._id}
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                                title="Mark as paid manually"
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => cancelRequest(request._id)}
                                disabled={processingId === request._id}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                title="Cancel"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          
                          {request.status === 'paid' && (
                            <button
                              onClick={() => applyChanges(request._id)}
                              disabled={processingId === request._id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                              {processingId === request._id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <PlayCircle className="w-3.5 h-3.5" />
                              )}
                              Apply Changes
                            </button>
                          )}
                          
                          {(request.status === 'applied' || request.status === 'cancelled' || request.status === 'expired') && (
                            <span className="text-sm text-gray-400">
                              {request.status === 'applied' && request.appliedAt && (
                                <>Done {new Date(request.appliedAt).toLocaleDateString()}</>
                              )}
                              {request.status === 'cancelled' && 'Cancelled'}
                              {request.status === 'expired' && 'Expired'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Details */}
                    {expandedId === request._id && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-2 gap-6">
                            {/* Address Change */}
                            {(request.type === 'address' || request.type === 'both') && (
                              <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-blue-500" />
                                  Address Change
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <div className="text-xs text-gray-500 uppercase mb-1">Original</div>
                                    <div className="text-gray-700">
                                      {request.originalAddress.street1}<br />
                                      {request.originalAddress.street2 && <>{request.originalAddress.street2}<br /></>}
                                      {request.originalAddress.city}, {request.originalAddress.state} {request.originalAddress.zip}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-500 uppercase mb-1">New</div>
                                    <div className="text-green-700 font-medium">
                                      {request.newAddress.street1}<br />
                                      {request.newAddress.street2 && <>{request.newAddress.street2}<br /></>}
                                      {request.newAddress.city}, {request.newAddress.state} {request.newAddress.zip}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Package Change */}
                            {(request.type === 'package' || request.type === 'both') && (
                              <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <Package className="w-4 h-4 text-orange-500" />
                                  Package Change
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <div className="text-xs text-gray-500 uppercase mb-1">Original</div>
                                    <div className="text-gray-700">
                                      {request.originalPackage.weight} lbs<br />
                                      {request.originalPackage.length}" × {request.originalPackage.width}" × {request.originalPackage.height}"
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-500 uppercase mb-1">New</div>
                                    <div className="text-green-700 font-medium">
                                      {request.newPackage.weight} lbs<br />
                                      {request.newPackage.length}" × {request.newPackage.width}" × {request.newPackage.height}"
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Cost Breakdown */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-green-500" />
                                Cost Breakdown
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Customer Paid:</span>
                                  <span className="font-medium">${(request.costs.customerPaid / 100).toFixed(2)}</span>
                                </div>
                                {request.costs.originalRate && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Original Rate:</span>
                                    <span className="font-medium">${(request.costs.originalRate / 100).toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-gray-600">New Rate:</span>
                                  <span className="font-medium">${(request.costs.newRate / 100).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-gray-200">
                                  <span className="font-semibold text-gray-900">Additional Cost:</span>
                                  <span className="font-bold text-red-600">${(request.costs.additionalCost / 100).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Payment Link */}
                            {request.stripe?.paymentLinkUrl && (
                              <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <CreditCard className="w-4 h-4 text-purple-500" />
                                  Payment Link
                                </h4>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={request.stripe.paymentLinkUrl}
                                    readOnly
                                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600"
                                  />
                                  <button
                                    onClick={() => copyPaymentLink(request.stripe!.paymentLinkUrl!)}
                                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                  <a
                                    href={request.stripe.paymentLinkUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">💳 How Change Requests Work</h4>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>When you edit an order&apos;s address/package and there&apos;s an additional cost, a change request is created</li>
          <li>Click <strong>&quot;Send Invoice&quot;</strong> to email the customer with a payment link</li>
          <li>Customer pays via Stripe → Status automatically changes to &quot;Paid&quot;</li>
          <li>Click <strong>&quot;Apply Changes&quot;</strong> to activate the new address/package</li>
          <li>The order can now be shipped with the updated information</li>
        </ol>
        <p className="mt-3 text-sm text-blue-600">
          <strong>⚠️ Note:</strong> Orders with pending change requests are blocked from shipping until paid and applied.
        </p>
      </div>
    </div>
  )
}