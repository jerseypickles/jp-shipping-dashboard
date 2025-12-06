'use client'

import { useState, useEffect, Fragment } from 'react'
import { 
  Package, 
  RefreshCw, 
  Truck,
  MapPin,
  Scale,
  CheckSquare,
  Square,
  Loader2,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Calculator,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  Edit3,
  X,
  Save,
  AlertTriangle,
  Copy,
  TrendingDown,
  TrendingUp
} from 'lucide-react'
import { getUnfulfilledOrders, buyLabel, buyBatchLabels, getRates } from '@/lib/api'

interface OrderItem {
  name: string;
  sku: string;
  quantity: number;
  price?: string;
  variant_title?: string;
}

interface Order {
  shopifyOrderId: string;
  orderNumber: string;
  orderDate: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  shipTo: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone?: string;
  };
  package: {
    weight: number;
    length: number;
    width: number;
    height: number;
  };
  items: OrderItem[];
  totals: {
    total: string;
    shipping?: string;
  };
  shippingPaid?: {
    amount: string;
    method: string;
    code?: string;
  };
}

interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface RateInfo {
  loading: boolean;
  rate?: number;
  rateFormatted?: string;
  service?: string;
  error?: string;
}

interface ShipResult {
  orderNumber: string;
  trackingNumber?: string;
  cost?: string;
  error?: string;
}

interface EditingAddress {
  orderId: string;
  orderNumber: string;
  originalShipTo: {
    name: string;
    street1: string;
    street2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone: string;
  };
  shipTo: {
    name: string;
    street1: string;
    street2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone: string;
  };
  customerPaid: number;
  originalRate: number | null;
  newRate: number | null;
  newRateLoading: boolean;
  newRateError: string | null;
  package: {
    weight: number;
    length: number;
    width: number;
    height: number;
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [shipping, setShipping] = useState(false)
  const [gettingRates, setGettingRates] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [shipResults, setShipResults] = useState<ShipResult[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 100
  
  const [rates, setRates] = useState<Record<string, RateInfo>>({})
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [editingAddress, setEditingAddress] = useState<EditingAddress | null>(null)
  const [savingAddress, setSavingAddress] = useState(false)
  const [copiedInvoice, setCopiedInvoice] = useState(false)

  async function loadOrders(page: number = 1, refresh: boolean = false) {
    setLoading(true)
    setError(null)
    
    try {
      const data = await getUnfulfilledOrders({ page, perPage, refresh })
      setOrders(data.orders || [])
      setPagination(data.pagination || null)
      setCurrentPage(page)
      if (refresh) {
        setRates({})
        setExpandedOrders(new Set())
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders(1)
  }, [])

  function toggleSelect(orderId: string) {
    const newSelected = new Set(selected)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelected(newSelected)
  }

  function toggleSelectAll() {
    if (selected.size === orders.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(orders.map(o => o.shopifyOrderId)))
    }
  }
  
  function toggleExpanded(orderId: string) {
    const newExpanded = new Set(expandedOrders)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
    }
    setExpandedOrders(newExpanded)
  }
  
  function openEditAddress(order: Order) {
    const customerPaid = parseFloat(order.shippingPaid?.amount || '0') * 100
    const existingRate = rates[order.shopifyOrderId]?.rate || null
    
    setEditingAddress({
      orderId: order.shopifyOrderId,
      orderNumber: order.orderNumber,
      originalShipTo: {
        name: order.shipTo?.name || '',
        street1: order.shipTo?.street1 || '',
        street2: order.shipTo?.street2 || '',
        city: order.shipTo?.city || '',
        state: order.shipTo?.state || '',
        zip: order.shipTo?.zip || '',
        country: order.shipTo?.country || 'US',
        phone: order.shipTo?.phone || order.customer?.phone || ''
      },
      shipTo: {
        name: order.shipTo?.name || '',
        street1: order.shipTo?.street1 || '',
        street2: order.shipTo?.street2 || '',
        city: order.shipTo?.city || '',
        state: order.shipTo?.state || '',
        zip: order.shipTo?.zip || '',
        country: order.shipTo?.country || 'US',
        phone: order.shipTo?.phone || order.customer?.phone || ''
      },
      customerPaid,
      originalRate: existingRate,
      newRate: null,
      newRateLoading: false,
      newRateError: null,
      package: order.package
    })
  }
  
  function hasAddressChanged(): boolean {
    if (!editingAddress) return false
    const orig = editingAddress.originalShipTo
    const curr = editingAddress.shipTo
    return (
      orig.street1 !== curr.street1 ||
      orig.street2 !== curr.street2 ||
      orig.city !== curr.city ||
      orig.state !== curr.state ||
      orig.zip !== curr.zip
    )
  }
  
  async function calculateNewRate() {
    if (!editingAddress) return
    
    setEditingAddress(prev => prev ? {
      ...prev,
      newRateLoading: true,
      newRateError: null,
      newRate: null
    } : null)
    
    try {
      const orderForRate = {
        shipTo: editingAddress.shipTo,
        package: editingAddress.package
      }
      
      const rateData = await getRates(orderForRate)
      
      let ratesArray: any[] = []
      if (Array.isArray(rateData)) {
        ratesArray = rateData
      } else if (rateData?.rates && Array.isArray(rateData.rates)) {
        ratesArray = rateData.rates
      } else if (rateData?.RatedShipment) {
        ratesArray = rateData.RatedShipment
      }
      
      if (ratesArray.length === 0) {
        throw new Error('No rates available for this address')
      }
      
      const groundRate = ratesArray.find((r: any) => 
        r.service === '03' || r.serviceCode === '03' || r.Service?.Code === '03'
      )
      const selectedRate = groundRate || ratesArray[0]
      
      let amountCents = 0
      if (selectedRate.amountCents) {
        amountCents = selectedRate.amountCents
      } else if (selectedRate.amount) {
        amountCents = Math.round(selectedRate.amount * 100)
      } else if (selectedRate.TotalCharges?.MonetaryValue) {
        amountCents = Math.round(parseFloat(selectedRate.TotalCharges.MonetaryValue) * 100)
      }
      
      setEditingAddress(prev => prev ? {
        ...prev,
        newRateLoading: false,
        newRate: amountCents
      } : null)
      
    } catch (err: any) {
      setEditingAddress(prev => prev ? {
        ...prev,
        newRateLoading: false,
        newRateError: err.message
      } : null)
    }
  }
  
  function copyInvoiceText() {
    if (!editingAddress || editingAddress.newRate === null) return
    
    const customerPaid = editingAddress.customerPaid
    const newRate = editingAddress.newRate
    const originalRate = editingAddress.originalRate || customerPaid
    const additionalCost = newRate - originalRate
    
    const text = `
Order: ${editingAddress.orderNumber}
Address Change Request

Original Address:
${editingAddress.originalShipTo.street1}${editingAddress.originalShipTo.street2 ? ', ' + editingAddress.originalShipTo.street2 : ''}
${editingAddress.originalShipTo.city}, ${editingAddress.originalShipTo.state} ${editingAddress.originalShipTo.zip}

New Address:
${editingAddress.shipTo.street1}${editingAddress.shipTo.street2 ? ', ' + editingAddress.shipTo.street2 : ''}
${editingAddress.shipTo.city}, ${editingAddress.shipTo.state} ${editingAddress.shipTo.zip}

Original Shipping Paid: $${(customerPaid / 100).toFixed(2)}
New Shipping Cost: $${(newRate / 100).toFixed(2)}
Additional Charge: $${(additionalCost / 100).toFixed(2)}

Please send payment of $${(additionalCost / 100).toFixed(2)} to proceed with the address change.
    `.trim()
    
    navigator.clipboard.writeText(text)
    setCopiedInvoice(true)
    setTimeout(() => setCopiedInvoice(false), 2000)
  }
  
  function saveAddress() {
    if (!editingAddress) return
    
    setSavingAddress(true)
    
    setOrders(prev => prev.map(order => {
      if (order.shopifyOrderId === editingAddress.orderId) {
        return {
          ...order,
          shipTo: {
            ...order.shipTo,
            ...editingAddress.shipTo
          }
        }
      }
      return order
    }))
    
    if (editingAddress.newRate !== null) {
      setRates(prev => ({
        ...prev,
        [editingAddress.orderId]: {
          loading: false,
          rate: editingAddress.newRate!,
          rateFormatted: `$${(editingAddress.newRate! / 100).toFixed(2)}`,
          service: 'UPS Ground'
        }
      }))
    } else {
      setRates(prev => {
        const newRates = { ...prev }
        delete newRates[editingAddress.orderId]
        return newRates
      })
    }
    
    setSavingAddress(false)
    
    const addressChanged = hasAddressChanged()
    if (addressChanged && editingAddress.newRate !== null) {
      const profit = editingAddress.customerPaid - editingAddress.newRate
      if (profit < 0) {
        setSuccess(`⚠️ Address updated for ${editingAddress.orderNumber}. Loss: $${Math.abs(profit / 100).toFixed(2)}`)
      } else {
        setSuccess(`✓ Address updated for ${editingAddress.orderNumber}. New rate: $${(editingAddress.newRate / 100).toFixed(2)}`)
      }
    } else {
      setSuccess(`✓ Address updated.`)
    }
    
    setEditingAddress(null)
  }

  async function handleGetRates() {
    if (selected.size === 0) return
    
    setGettingRates(true)
    setError(null)
    
    const selectedOrders = orders.filter(o => selected.has(o.shopifyOrderId))
    
    const newRates: Record<string, RateInfo> = {}
    selectedOrders.forEach(o => {
      newRates[o.shopifyOrderId] = { loading: true }
    })
    setRates(prev => ({ ...prev, ...newRates }))
    
    for (const order of selectedOrders) {
      try {
        if (!order.shipTo || !order.shipTo.zip) {
          throw new Error('Order missing shipping address')
        }
        
        const rateData = await getRates(order)
        
        let ratesArray: any[] = []
        if (Array.isArray(rateData)) {
          ratesArray = rateData
        } else if (rateData?.rates && Array.isArray(rateData.rates)) {
          ratesArray = rateData.rates
        } else if (rateData?.RatedShipment) {
          ratesArray = rateData.RatedShipment
        }
        
        if (ratesArray.length === 0) {
          throw new Error('No rates returned')
        }
        
        const groundRate = ratesArray.find((r: any) => 
          r.service === '03' || r.serviceCode === '03' || r.Service?.Code === '03'
        )
        const selectedRate = groundRate || ratesArray[0]
        
        let amountCents = 0
        if (selectedRate.amountCents) {
          amountCents = selectedRate.amountCents
        } else if (selectedRate.amount) {
          amountCents = Math.round(selectedRate.amount * 100)
        } else if (selectedRate.TotalCharges?.MonetaryValue) {
          amountCents = Math.round(parseFloat(selectedRate.TotalCharges.MonetaryValue) * 100)
        }
        
        setRates(prev => ({
          ...prev,
          [order.shopifyOrderId]: {
            loading: false,
            rate: amountCents,
            rateFormatted: `$${(amountCents / 100).toFixed(2)}`,
            service: selectedRate.serviceName || selectedRate.service || 'UPS Ground'
          }
        }))
      } catch (err: any) {
        setRates(prev => ({
          ...prev,
          [order.shopifyOrderId]: {
            loading: false,
            error: err.message
          }
        }))
      }
    }
    
    setGettingRates(false)
  }

  async function handleShipSelected() {
    if (selected.size === 0) return
    
    setShipping(true)
    setError(null)
    setSuccess(null)
    setShipResults([])
    
    try {
      const selectedOrders = orders.filter(o => selected.has(o.shopifyOrderId))
      
      if (selectedOrders.length === 1) {
        const order = selectedOrders[0]
        const result = await buyLabel(order)
        
        const cost = result.cost?.formatted || 
                     (result.cost?.amount ? `$${(result.cost.amount / 100).toFixed(2)}` : 
                      result.charges?.total ? `$${(result.charges.total / 100).toFixed(2)}` : 'N/A')
        
        setShipResults([{
          orderNumber: order.orderNumber,
          trackingNumber: result.tracking?.number || result.trackingNumber || result.shipment?.trackingNumber,
          cost: cost
        }])
        
        setSuccess(
          `✓ Label created for ${order.orderNumber}\n` +
          `Tracking: ${result.tracking?.number || result.trackingNumber || result.shipment?.trackingNumber}\n` +
          `Cost: ${cost}`
        )
      } else {
        const result = await buyBatchLabels(selectedOrders)
        
        const results: ShipResult[] = []
        
        if (result.successful) {
          result.successful.forEach((s: any) => {
            results.push({
              orderNumber: s.orderNumber,
              trackingNumber: s.trackingNumber,
              cost: s.cost
            })
          })
        }
        
        if (result.failed) {
          result.failed.forEach((f: any) => {
            results.push({
              orderNumber: f.orderNumber,
              error: f.error
            })
          })
        }
        
        setShipResults(results)
        
        const successCount = result.summary?.success || result.successful?.length || 0
        const failedCount = result.summary?.failed || result.failed?.length || 0
        const totalCost = result.summary?.totalCostFormatted || 
                          `$${((result.summary?.totalCost || 0) / 100).toFixed(2)}`
        
        setSuccess(
          `Created ${successCount} labels${failedCount > 0 ? `, ${failedCount} failed` : ''}\n` +
          `Total Cost: ${totalCost}`
        )
      }
      
      await loadOrders(currentPage, true)
      setSelected(new Set())
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setShipping(false)
    }
  }

  function goToPage(page: number) {
    if (page >= 1 && page <= (pagination?.totalPages || 1)) {
      setSelected(new Set())
      setExpandedOrders(new Set())
      loadOrders(page)
    }
  }

  const selectedOrders = orders.filter(o => selected.has(o.shopifyOrderId))
  const totalWeight = selectedOrders.reduce((sum, o) => sum + (o.package?.weight || 0), 0)
  const totalItems = selectedOrders.reduce((sum, o) => sum + (o.items?.length || 0), 0)
  
  const totalEstimatedCost = selectedOrders.reduce((sum, o) => {
    const rate = rates[o.shopifyOrderId]
    return sum + (rate?.rate || 0)
  }, 0)
  
  const totalCustomerPaid = selectedOrders.reduce((sum, o) => {
    return sum + (parseFloat(o.shippingPaid?.amount || '0') * 100)
  }, 0)
  
  const totalProfit = totalCustomerPaid - totalEstimatedCost
  const hasAllRates = selectedOrders.length > 0 && selectedOrders.every(o => rates[o.shopifyOrderId]?.rate !== undefined)

  const addressChanged = editingAddress ? hasAddressChanged() : false
  const canCalculateRate = editingAddress && editingAddress.shipTo.zip && editingAddress.shipTo.zip.length >= 5

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Orders</h1>
          <p className="text-gray-500 mt-1">
            {pagination ? `${pagination.total} orders total` : `${orders.length} orders`}
            {pagination && pagination.totalPages > 1 && ` • Page ${pagination.page} of ${pagination.totalPages}`}
          </p>
        </div>
        <button
          onClick={() => loadOrders(1, true)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Sync from Shopify
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-red-700">{error}</div>
        </div>
      )}
      
      {/* Success Alert */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="text-green-700 whitespace-pre-line">{success}</div>
          </div>
          
          {shipResults.length > 0 && (
            <div className="mt-4 bg-white rounded-lg border border-green-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-green-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-green-800">Order</th>
                    <th className="px-4 py-2 text-left font-medium text-green-800">Tracking</th>
                    <th className="px-4 py-2 text-left font-medium text-green-800">Cost</th>
                    <th className="px-4 py-2 text-left font-medium text-green-800">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-100">
                  {shipResults.map((r, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 font-medium">{r.orderNumber}</td>
                      <td className="px-4 py-2">
                        {r.trackingNumber ? (
                          <a 
                            href={`https://www.ups.com/track?tracknum=${r.trackingNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {r.trackingNumber}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-2 font-medium">{r.cost || '-'}</td>
                      <td className="px-4 py-2">
                        {r.error ? (
                          <span className="text-red-600">{r.error}</span>
                        ) : (
                          <span className="text-green-600">✓ Created</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Action Bar */}
      {selected.size > 0 && (
        <div className="mb-6 p-4 bg-pickle-50 border border-pickle-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="font-semibold text-pickle-800">
                {selected.size} order{selected.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-4 text-sm text-pickle-600">
                <span className="flex items-center gap-1">
                  <Scale className="w-4 h-4" />
                  {totalWeight.toFixed(1)} lbs
                </span>
                <span className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  {totalItems} items
                </span>
                {totalEstimatedCost > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                    <DollarSign className="w-4 h-4" />
                    Cost: ${(totalEstimatedCost / 100).toFixed(2)}
                  </span>
                )}
                {hasAllRates && totalCustomerPaid > 0 && (
                  <span className={`flex items-center gap-1 font-semibold px-2 py-1 rounded ${
                    totalProfit >= 0 ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                  }`}>
                    {totalProfit >= 0 ? '📈' : '📉'}
                    {totalProfit >= 0 ? '+' : '-'}${Math.abs(totalProfit / 100).toFixed(2)} {totalProfit >= 0 ? 'profit' : 'loss'}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleGetRates}
                disabled={gettingRates || shipping}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-pickle-300 text-pickle-700 rounded-lg hover:bg-pickle-100 transition-colors disabled:opacity-50 font-medium"
              >
                {gettingRates ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                {gettingRates ? 'Getting Rates...' : 'Get Rates'}
              </button>
              
              <button
                onClick={handleShipSelected}
                disabled={shipping || gettingRates}
                className="flex items-center gap-2 px-6 py-2.5 bg-pickle-600 text-white rounded-lg hover:bg-pickle-700 transition-colors disabled:opacity-50 font-medium"
              >
                {shipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                {shipping ? 'Creating...' : `Ship ${selected.size}`}
                {hasAllRates && totalEstimatedCost > 0 && (
                  <span className="ml-1">(${(totalEstimatedCost / 100).toFixed(2)})</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
            <p className="mt-4 text-gray-500">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No pending orders</h3>
            <p className="mt-2 text-gray-500">All orders have been fulfilled!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left w-12">
                    <button onClick={toggleSelectAll} className="p-1 hover:bg-gray-200 rounded">
                      {selected.size === orders.length ? (
                        <CheckSquare className="w-5 h-5 text-pickle-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left w-10"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Destination</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Weight</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Order $</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase bg-blue-50">
                    <div>UPS Rate</div>
                    <div className="font-normal text-gray-400 normal-case">vs Customer Paid</div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-16">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => {
                  const orderRate = rates[order.shopifyOrderId]
                  const hasShipTo = order.shipTo && order.shipTo.zip
                  const isExpanded = expandedOrders.has(order.shopifyOrderId)
                  
                  return (
                    <Fragment key={order.shopifyOrderId}>
                      <tr className={`hover:bg-gray-50 transition-colors ${selected.has(order.shopifyOrderId) ? 'bg-pickle-50 hover:bg-pickle-100' : ''}`}>
                        <td className="px-4 py-4">
                          <button onClick={() => toggleSelect(order.shopifyOrderId)} className="p-1 hover:bg-gray-200 rounded">
                            {selected.has(order.shopifyOrderId) ? (
                              <CheckSquare className="w-5 h-5 text-pickle-600" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-2 py-4">
                          <button 
                            onClick={() => toggleExpanded(order.shopifyOrderId)}
                            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                            title={isExpanded ? 'Hide products' : 'Show products'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-gray-900">{order.orderNumber}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(order.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-900">{order.customer?.name || 'N/A'}</div>
                          <div className="text-xs text-gray-500 mt-1 truncate max-w-[150px]">{order.customer?.email || ''}</div>
                        </td>
                        <td className="px-4 py-4">
                          {hasShipTo ? (
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <div className="text-gray-900">{order.shipTo.city}, {order.shipTo.state}</div>
                                <div className="text-xs text-gray-500 mt-1">{order.shipTo.zip}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-red-500 text-sm">No address</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Scale className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{order.package?.weight?.toFixed(1) || '1.0'} lbs</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {order.items?.length || 0} items
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-medium text-gray-900">${order.totals?.total || '0.00'}</span>
                        </td>
                        <td className="px-4 py-4 bg-blue-50">
                          {orderRate?.loading ? (
                            <div className="flex items-center gap-2 text-gray-400">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm">...</span>
                            </div>
                          ) : orderRate?.error ? (
                            <span className="text-xs text-red-500" title={orderRate.error}>Error</span>
                          ) : orderRate?.rateFormatted ? (
                            <div>
                              <span className="font-bold text-green-600 text-lg">{orderRate.rateFormatted}</span>
                              <div className="text-xs text-gray-500">{orderRate.service}</div>
                              {order.shippingPaid && (
                                <div className="mt-1 pt-1 border-t border-blue-200">
                                  <div className="text-xs text-gray-600">
                                    Paid: <span className="font-semibold">${parseFloat(order.shippingPaid.amount || '0').toFixed(2)}</span>
                                  </div>
                                  {(() => {
                                    const paid = parseFloat(order.shippingPaid.amount || '0') * 100
                                    const cost = orderRate.rate || 0
                                    const diff = paid - cost
                                    const diffFormatted = `$${Math.abs(diff / 100).toFixed(2)}`
                                    if (diff > 0) return <div className="text-xs font-semibold text-green-600">+{diffFormatted} profit</div>
                                    if (diff < 0) return <div className="text-xs font-semibold text-red-600">-{diffFormatted} loss</div>
                                    return <div className="text-xs text-gray-500">Break even</div>
                                  })()}
                                </div>
                              )}
                            </div>
                          ) : hasShipTo ? (
                            <div>
                              <span className="text-gray-400 text-sm">Get Rates</span>
                              {order.shippingPaid && parseFloat(order.shippingPaid.amount || '0') > 0 && (
                                <div className="mt-1 text-xs text-gray-500">Paid: ${parseFloat(order.shippingPaid.amount).toFixed(2)}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-red-400 text-sm">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => openEditAddress(order)}
                            className="p-2 text-gray-400 hover:text-pickle-600 hover:bg-pickle-50 rounded-lg transition-colors"
                            title="Edit shipping address"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      
                      {/* Expanded Products Row */}
                      {isExpanded && (
                        <tr className="bg-gray-50">
                          <td colSpan={10} className="px-4 py-0">
                            <div className="py-4 pl-14 pr-4">
                              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
                                  <span className="text-sm font-medium text-gray-700">📦 Products in Order {order.orderNumber}</span>
                                </div>
                                <table className="w-full">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
                                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {order.items && order.items.length > 0 ? (
                                      order.items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                          <td className="px-4 py-3"><span className="font-medium text-gray-900">{item.name || 'Unknown Product'}</span></td>
                                          <td className="px-4 py-3"><span className="text-sm text-gray-500 font-mono">{item.sku || '-'}</span></td>
                                          <td className="px-4 py-3"><span className="text-sm text-gray-500">{item.variant_title || '-'}</span></td>
                                          <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-pickle-100 text-pickle-700 font-semibold text-sm">{item.quantity}</span>
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                            <span className="font-medium text-gray-900">{item.price ? `$${parseFloat(item.price).toFixed(2)}` : '-'}</span>
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No product details available</td></tr>
                                    )}
                                  </tbody>
                                </table>
                                
                                {order.shipTo && (
                                  <div className="px-4 py-3 bg-blue-50 border-t border-gray-200">
                                    <div className="flex items-start gap-3">
                                      <MapPin className="w-4 h-4 text-blue-500 mt-0.5" />
                                      <div className="text-sm">
                                        <div className="font-medium text-gray-900">{order.shipTo.name}</div>
                                        <div className="text-gray-600">{order.shipTo.street1}</div>
                                        {order.shipTo.street2 && <div className="text-gray-600">{order.shipTo.street2}</div>}
                                        <div className="text-gray-600">{order.shipTo.city}, {order.shipTo.state} {order.shipTo.zip}</div>
                                        {order.shipTo.phone && <div className="text-gray-500 mt-1">📞 {order.shipTo.phone}</div>}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((pagination.page - 1) * pagination.perPage) + 1} - {Math.min(pagination.page * pagination.perPage, pagination.total)} of {pagination.total} orders
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => goToPage(1)} disabled={!pagination.hasPrev || loading} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" title="First page">
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button onClick={() => goToPage(pagination.page - 1)} disabled={!pagination.hasPrev || loading} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" title="Previous page">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum
                if (pagination.totalPages <= 5) pageNum = i + 1
                else if (pagination.page <= 3) pageNum = i + 1
                else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i
                else pageNum = pagination.page - 2 + i
                
                return (
                  <button key={pageNum} onClick={() => goToPage(pageNum)} disabled={loading}
                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${pageNum === pagination.page ? 'bg-pickle-600 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}>
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <button onClick={() => goToPage(pagination.page + 1)} disabled={!pagination.hasNext || loading} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" title="Next page">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => goToPage(pagination.totalPages)} disabled={!pagination.hasNext || loading} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" title="Last page">
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">📦 How to ship orders:</h4>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Select orders using checkboxes</li>
          <li>Click <strong>&quot;Get Rates&quot;</strong> to see UPS shipping cost</li>
          <li>Review rates in blue &quot;UPS Rate&quot; column</li>
          <li>Click <strong>&quot;Ship&quot;</strong> to create labels</li>
        </ol>
        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className="text-sm text-blue-700">
            <strong>💡 Tip:</strong> Click ▼ to see products. Click ✏️ to edit address (calculates new rate automatically).
          </p>
        </div>
      </div>
      
      {/* Edit Address Modal */}
      {editingAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-pickle-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5" />
                <span className="font-semibold">Edit Shipping Address - {editingAddress.orderNumber}</span>
              </div>
              <button onClick={() => setEditingAddress(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name *</label>
                <input type="text" value={editingAddress.shipTo.name}
                  onChange={(e) => setEditingAddress({ ...editingAddress, shipTo: { ...editingAddress.shipTo, name: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
                  placeholder="John Doe" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                <input type="text" value={editingAddress.shipTo.street1}
                  onChange={(e) => setEditingAddress({ ...editingAddress, shipTo: { ...editingAddress.shipTo, street1: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
                  placeholder="123 Main St" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apt/Suite/Unit</label>
                <input type="text" value={editingAddress.shipTo.street2}
                  onChange={(e) => setEditingAddress({ ...editingAddress, shipTo: { ...editingAddress.shipTo, street2: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
                  placeholder="Apt 4B" />
              </div>
              
              <div className="grid grid-cols-6 gap-3">
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input type="text" value={editingAddress.shipTo.city}
                    onChange={(e) => setEditingAddress({ ...editingAddress, shipTo: { ...editingAddress.shipTo, city: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
                    placeholder="Newark" />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <input type="text" value={editingAddress.shipTo.state} maxLength={2}
                    onChange={(e) => setEditingAddress({ ...editingAddress, shipTo: { ...editingAddress.shipTo, state: e.target.value.toUpperCase() } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500 uppercase"
                    placeholder="NJ" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code *</label>
                  <input type="text" value={editingAddress.shipTo.zip} maxLength={10}
                    onChange={(e) => setEditingAddress({ ...editingAddress, shipTo: { ...editingAddress.shipTo, zip: e.target.value }, newRate: null, newRateError: null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
                    placeholder="07102" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={editingAddress.shipTo.phone}
                  onChange={(e) => setEditingAddress({ ...editingAddress, shipTo: { ...editingAddress.shipTo, phone: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
                  placeholder="(555) 123-4567" />
              </div>
              
              {/* Calculate Rate Button */}
              {addressChanged && canCalculateRate && (
                <div className="pt-2">
                  <button onClick={calculateNewRate} disabled={editingAddress.newRateLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium">
                    {editingAddress.newRateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                    {editingAddress.newRateLoading ? 'Calculating...' : 'Calculate New Rate'}
                  </button>
                </div>
              )}
              
              {/* Cost Comparison Box */}
              {addressChanged && (editingAddress.newRate !== null || editingAddress.newRateError) && (
                <div className={`p-4 rounded-lg border-2 ${
                  editingAddress.newRateError ? 'bg-red-50 border-red-200' 
                    : (editingAddress.customerPaid - editingAddress.newRate!) >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-5 h-5" />
                    <span className="font-semibold text-gray-800">Cost Comparison</span>
                  </div>
                  
                  {editingAddress.newRateError ? (
                    <div className="text-red-600"><AlertCircle className="w-4 h-4 inline mr-1" />{editingAddress.newRateError}</div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      {/* Address Comparison */}
                      <div className="grid grid-cols-2 gap-4 pb-3 border-b border-gray-200">
                        <div>
                          <div className="text-gray-500 text-xs uppercase mb-1">Original Address</div>
                          <div className="font-medium">{editingAddress.originalShipTo.city}, {editingAddress.originalShipTo.state} {editingAddress.originalShipTo.zip}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs uppercase mb-1">New Address</div>
                          <div className="font-medium">{editingAddress.shipTo.city}, {editingAddress.shipTo.state} {editingAddress.shipTo.zip}</div>
                        </div>
                      </div>
                      
                      {/* Cost Breakdown */}
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Customer Paid:</span>
                          <span className="font-semibold">${(editingAddress.customerPaid / 100).toFixed(2)}</span>
                        </div>
                        
                        {editingAddress.originalRate && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Original Rate:</span>
                            <span className="font-medium">
                              ${(editingAddress.originalRate / 100).toFixed(2)}
                              <span className={`ml-2 text-xs ${(editingAddress.customerPaid - editingAddress.originalRate) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ({(editingAddress.customerPaid - editingAddress.originalRate) >= 0 ? '+' : ''}${((editingAddress.customerPaid - editingAddress.originalRate) / 100).toFixed(2)})
                              </span>
                            </span>
                          </div>
                        )}
                        
                        <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200">
                          <span>NEW Rate:</span>
                          <span className={editingAddress.newRate! > editingAddress.customerPaid ? 'text-red-600' : 'text-green-600'}>
                            ${(editingAddress.newRate! / 100).toFixed(2)}
                          </span>
                        </div>
                        
                        {/* Profit/Loss */}
                        {(() => {
                          const diff = editingAddress.customerPaid - editingAddress.newRate!
                          const isLoss = diff < 0
                          const rateDiff = editingAddress.originalRate ? editingAddress.newRate! - editingAddress.originalRate : 0
                          
                          return (
                            <div className={`p-3 rounded-lg mt-2 ${isLoss ? 'bg-red-100' : 'bg-green-100'}`}>
                              <div className="flex items-center gap-2">
                                {isLoss ? <TrendingDown className="w-5 h-5 text-red-600" /> : <TrendingUp className="w-5 h-5 text-green-600" />}
                                <span className={`font-bold ${isLoss ? 'text-red-700' : 'text-green-700'}`}>
                                  {isLoss ? 'LOSS' : 'PROFIT'}: {isLoss ? '-' : '+'}${Math.abs(diff / 100).toFixed(2)}
                                </span>
                              </div>
                              {rateDiff > 0 && (
                                <div className="mt-2 text-sm text-red-600">
                                  ⚠️ Address change costs <strong>${(rateDiff / 100).toFixed(2)} MORE</strong> than original
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Warning for no rate calculated yet */}
              {addressChanged && editingAddress.newRate === null && !editingAddress.newRateLoading && !editingAddress.newRateError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">
                    ⚠️ <strong>Address changed!</strong> Click &quot;Calculate New Rate&quot; to see shipping cost before saving.
                  </p>
                </div>
              )}
              
              {/* Standard warning */}
              {!addressChanged && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">
                    💡 Changes are temporary and only affect this shipping session. The original Shopify order will not be updated.
                  </p>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                {/* Left side - Copy Invoice button */}
                <div>
                  {addressChanged && editingAddress.newRate !== null && (editingAddress.customerPaid - editingAddress.newRate) < 0 && (
                    <button onClick={copyInvoiceText}
                      className="flex items-center gap-2 px-3 py-2 text-amber-700 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium">
                      <Copy className="w-4 h-4" />
                      {copiedInvoice ? 'Copied!' : 'Copy Invoice for Customer'}
                    </button>
                  )}
                </div>
                
                {/* Right side - Action buttons */}
                <div className="flex items-center gap-3">
                  <button onClick={() => setEditingAddress(null)}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                    Cancel
                  </button>
                  
                  {addressChanged && editingAddress.newRate !== null && (editingAddress.customerPaid - editingAddress.newRate) < 0 ? (
                    <button onClick={saveAddress} disabled={savingAddress}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
                      {savingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                      Proceed with Loss (-${Math.abs((editingAddress.customerPaid - editingAddress.newRate) / 100).toFixed(2)})
                    </button>
                  ) : (
                    <button onClick={saveAddress}
                      disabled={savingAddress || !editingAddress.shipTo.name || !editingAddress.shipTo.street1 || !editingAddress.shipTo.city || !editingAddress.shipTo.state || !editingAddress.shipTo.zip}
                      className="flex items-center gap-2 px-4 py-2 bg-pickle-600 text-white rounded-lg hover:bg-pickle-700 transition-colors font-medium disabled:opacity-50">
                      {savingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {addressChanged && editingAddress.newRate === null ? 'Save (Rate Unknown)' : 'Save Address'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}