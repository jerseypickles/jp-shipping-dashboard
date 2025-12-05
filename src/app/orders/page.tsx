'use client'

import { useState, useEffect } from 'react'
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
  ChevronsRight
} from 'lucide-react'
import { getUnfulfilledOrders, buyLabel, buyBatchLabels, getRates } from '@/lib/api'

interface OrderItem {
  name: string;
  sku: string;
  quantity: number;
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
  
  // Rates per order
  const [rates, setRates] = useState<Record<string, RateInfo>>({})

  async function loadOrders(page: number = 1, refresh: boolean = false) {
    setLoading(true)
    setError(null)
    
    try {
      const data = await getUnfulfilledOrders({ page, perPage, refresh })
      console.log('[Orders] Loaded:', data.orders?.length, 'orders, page', page, 'of', data.pagination?.totalPages)
      setOrders(data.orders || [])
      setPagination(data.pagination || null)
      setCurrentPage(page)
      if (refresh) {
        setRates({}) // Reset rates when refreshing
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

  // Get rates for selected orders
  async function handleGetRates() {
    if (selected.size === 0) return
    
    setGettingRates(true)
    setError(null)
    
    const selectedOrders = orders.filter(o => selected.has(o.shopifyOrderId))
    
    // Mark all as loading
    const newRates: Record<string, RateInfo> = {}
    selectedOrders.forEach(o => {
      newRates[o.shopifyOrderId] = { loading: true }
    })
    setRates(prev => ({ ...prev, ...newRates }))
    
    // Fetch rates one by one
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
          r.service === '03' || 
          r.serviceCode === '03' || 
          r.Service?.Code === '03'
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
      
      // Refresh orders
      await loadOrders(currentPage, true)
      setSelected(new Set())
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setShipping(false)
    }
  }

  // Pagination handlers
  function goToPage(page: number) {
    if (page >= 1 && page <= (pagination?.totalPages || 1)) {
      setSelected(new Set()) // Clear selection when changing pages
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
  
  // Calculate total shipping paid by customers and profit
  const totalCustomerPaid = selectedOrders.reduce((sum, o) => {
    return sum + (parseFloat(o.shippingPaid?.amount || '0') * 100)
  }, 0)
  
  const totalProfit = totalCustomerPaid - totalEstimatedCost
  
  const hasAllRates = selectedOrders.length > 0 && selectedOrders.every(o => rates[o.shopifyOrderId]?.rate !== undefined)

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
                    totalProfit >= 0 
                      ? 'text-green-700 bg-green-100' 
                      : 'text-red-700 bg-red-100'
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
                {gettingRates ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Calculator className="w-4 h-4" />
                )}
                {gettingRates ? 'Getting Rates...' : 'Get Rates'}
              </button>
              
              <button
                onClick={handleShipSelected}
                disabled={shipping || gettingRates}
                className="flex items-center gap-2 px-6 py-2.5 bg-pickle-600 text-white rounded-lg hover:bg-pickle-700 transition-colors disabled:opacity-50 font-medium"
              >
                {shipping ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Truck className="w-4 h-4" />
                )}
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => {
                  const orderRate = rates[order.shopifyOrderId]
                  const hasShipTo = order.shipTo && order.shipTo.zip
                  
                  return (
                    <tr 
                      key={order.shopifyOrderId}
                      className={`hover:bg-gray-50 transition-colors ${selected.has(order.shopifyOrderId) ? 'bg-pickle-50 hover:bg-pickle-100' : ''}`}
                    >
                      <td className="px-4 py-4">
                        <button 
                          onClick={() => toggleSelect(order.shopifyOrderId)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          {selected.has(order.shopifyOrderId) ? (
                            <CheckSquare className="w-5 h-5 text-pickle-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-900">{order.orderNumber}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(order.orderDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">{order.customer?.name || 'N/A'}</div>
                        <div className="text-xs text-gray-500 mt-1 truncate max-w-[150px]">
                          {order.customer?.email || ''}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {hasShipTo ? (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="text-gray-900">
                                {order.shipTo.city}, {order.shipTo.state}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {order.shipTo.zip}
                              </div>
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
                            {/* Show comparison with what customer paid */}
                            {order.shippingPaid && (
                              <div className="mt-1 pt-1 border-t border-blue-200">
                                <div className="text-xs text-gray-600">
                                  Paid: <span className="font-semibold">${parseFloat(order.shippingPaid.amount || '0').toFixed(2)}</span>
                                </div>
                                {(() => {
                                  const paid = parseFloat(order.shippingPaid.amount || '0') * 100;
                                  const cost = orderRate.rate || 0;
                                  const diff = paid - cost;
                                  const diffFormatted = `$${Math.abs(diff / 100).toFixed(2)}`;
                                  if (diff > 0) {
                                    return <div className="text-xs font-semibold text-green-600">+{diffFormatted} profit</div>;
                                  } else if (diff < 0) {
                                    return <div className="text-xs font-semibold text-red-600">-{diffFormatted} loss</div>;
                                  }
                                  return <div className="text-xs text-gray-500">Break even</div>;
                                })()}
                              </div>
                            )}
                          </div>
                        ) : hasShipTo ? (
                          <div>
                            <span className="text-gray-400 text-sm">Get Rates</span>
                            {/* Still show what customer paid even without rate */}
                            {order.shippingPaid && parseFloat(order.shippingPaid.amount || '0') > 0 && (
                              <div className="mt-1 text-xs text-gray-500">
                                Paid: ${parseFloat(order.shippingPaid.amount).toFixed(2)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-red-400 text-sm">N/A</span>
                        )}
                      </td>
                    </tr>
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
            {/* First */}
            <button
              onClick={() => goToPage(1)}
              disabled={!pagination.hasPrev || loading}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            
            {/* Previous */}
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={!pagination.hasPrev || loading}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    disabled={loading}
                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                      pageNum === pagination.page
                        ? 'bg-pickle-600 text-white'
                        : 'border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            {/* Next */}
            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={!pagination.hasNext || loading}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            
            {/* Last */}
            <button
              onClick={() => goToPage(pagination.totalPages)}
              disabled={!pagination.hasNext || loading}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Last page"
            >
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
          <li>Review rates in blue &quot;Ship Rate&quot; column</li>
          <li>Click <strong>&quot;Ship&quot;</strong> to create labels</li>
        </ol>
      </div>
    </div>
  )
}