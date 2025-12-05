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
  CheckCircle
} from 'lucide-react'
import { getUnfulfilledOrders, buyLabel, buyBatchLabels } from '@/lib/api'

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
  };
}

interface ShipResult {
  orderNumber: string;
  trackingNumber?: string;
  cost?: string;
  error?: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [shipping, setShipping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [shipResults, setShipResults] = useState<ShipResult[]>([])

  async function loadOrders() {
    setLoading(true)
    setError(null)
    
    try {
      const data = await getUnfulfilledOrders(100)
      setOrders(data.orders || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
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

  async function handleShipSelected() {
    if (selected.size === 0) return
    
    setShipping(true)
    setError(null)
    setSuccess(null)
    setShipResults([])
    
    try {
      const selectedOrders = orders.filter(o => selected.has(o.shopifyOrderId))
      
      if (selectedOrders.length === 1) {
        // Single order
        const result = await buyLabel(selectedOrders[0])
        
        setShipResults([{
          orderNumber: selectedOrders[0].orderNumber,
          trackingNumber: result.tracking?.number || result.shipment?.trackingNumber,
          cost: result.cost?.formatted || '$' + ((result.cost?.amount || 0) / 100).toFixed(2)
        }])
        
        setSuccess(
          `✓ Label created for ${selectedOrders[0].orderNumber}\n` +
          `Tracking: ${result.tracking?.number || result.shipment?.trackingNumber}\n` +
          `Cost: ${result.cost?.formatted || 'N/A'}\n` +
          `Week Total: ${result.wallet?.weekTotalFormatted || 'N/A'} (${result.wallet?.weekLabels || 0} labels)`
        )
      } else {
        // Batch orders
        const result = await buyBatchLabels(selectedOrders)
        
        // Map results
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
        const totalCost = result.summary?.totalCostFormatted || '$' + ((result.summary?.totalCost || 0) / 100).toFixed(2)
        
        if (failedCount > 0) {
          setSuccess(
            `Created ${successCount} labels, ${failedCount} failed\n` +
            `Total Cost: ${totalCost}`
          )
        } else {
          setSuccess(
            `✓ Created ${successCount} labels successfully!\n` +
            `Total Cost: ${totalCost}`
          )
        }
      }
      
      // Refresh orders
      await loadOrders()
      setSelected(new Set())
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setShipping(false)
    }
  }

  const selectedOrders = orders.filter(o => selected.has(o.shopifyOrderId))
  const totalWeight = selectedOrders.reduce((sum, o) => sum + (o.package?.weight || 0), 0)
  const totalItems = selectedOrders.reduce((sum, o) => sum + (o.items?.length || 0), 0)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Orders</h1>
          <p className="text-gray-500 mt-1">{orders.length} orders ready to ship</p>
        </div>
        <button
          onClick={loadOrders}
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
          
          {/* Ship Results Table */}
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
                      <td className="px-4 py-2">{r.cost || '-'}</td>
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
              </div>
            </div>
            <button
              onClick={handleShipSelected}
              disabled={shipping}
              className="flex items-center gap-2 px-6 py-2.5 bg-pickle-600 text-white rounded-lg hover:bg-pickle-700 transition-colors disabled:opacity-50 font-medium"
            >
              {shipping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Truck className="w-4 h-4" />
              )}
              {shipping ? 'Creating Labels...' : `Ship ${selected.size} Order${selected.size > 1 ? 's' : ''}`}
            </button>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Destination</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Weight</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
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
                      <div className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">
                        {order.customer?.email || ''}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-gray-900">
                            {order.shipTo?.city}, {order.shipTo?.state}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {order.shipTo?.zip}
                          </div>
                        </div>
                      </div>
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
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{order.totals?.total || '0.00'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Help Text */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Select orders and click &quot;Ship&quot; to create UPS labels. Labels will be added to the print queue.
      </div>
    </div>
  )
}