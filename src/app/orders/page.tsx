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
  ArrowUpDown,
  Loader2
} from 'lucide-react'
import { getUnfulfilledOrders, buyLabel, buyBatchLabels } from '@/lib/api'

interface Order {
  shopifyOrderId: string;
  orderNumber: string;
  orderDate: string;
  customer: {
    name: string;
    email: string;
  };
  shipTo: {
    name: string;
    city: string;
    state: string;
    zip: string;
  };
  package: {
    weight: number;
    items: { title: string; quantity: number }[];
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [shipping, setShipping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
    
    try {
      const selectedOrders = orders.filter(o => selected.has(o.shopifyOrderId))
      
      if (selectedOrders.length === 1) {
        const result = await buyLabel(selectedOrders[0])
        setSuccess(`Label created: ${result.shipment.trackingNumber}`)
      } else {
        const result = await buyBatchLabels(selectedOrders)
        setSuccess(`Created ${result.totalLabels} labels. Total: $${(result.totalCost / 100).toFixed(2)}`)
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

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Action Bar */}
      {selected.size > 0 && (
        <div className="mb-6 p-4 bg-pickle-50 border border-pickle-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-medium text-pickle-800">
              {selected.size} order{selected.size > 1 ? 's' : ''} selected
            </span>
            <span className="text-pickle-600">
              Total weight: {totalWeight.toFixed(1)} lbs
            </span>
          </div>
          <button
            onClick={handleShipSelected}
            disabled={shipping}
            className="flex items-center gap-2 px-6 py-2.5 bg-pickle-600 text-white rounded-lg hover:bg-pickle-700 transition-colors disabled:opacity-50"
          >
            {shipping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Truck className="w-4 h-4" />
            )}
            {shipping ? 'Creating Labels...' : `Ship ${selected.size} Order${selected.size > 1 ? 's' : ''}`}
          </button>
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
            <p className="mt-4 text-gray-500">No pending orders</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th className="w-12">
                    <button onClick={toggleSelectAll} className="p-1">
                      {selected.size === orders.length ? (
                        <CheckSquare className="w-5 h-5 text-pickle-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Destination</th>
                  <th>Weight</th>
                  <th>Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr 
                    key={order.shopifyOrderId}
                    className={selected.has(order.shopifyOrderId) ? 'bg-pickle-50' : ''}
                  >
                    <td>
                      <button 
                        onClick={() => toggleSelect(order.shopifyOrderId)}
                        className="p-1"
                      >
                        {selected.has(order.shopifyOrderId) ? (
                          <CheckSquare className="w-5 h-5 text-pickle-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td>
                      <div className="font-medium text-gray-900">{order.orderNumber}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div className="font-medium text-gray-900">{order.customer?.name}</div>
                      <div className="text-xs text-gray-500">{order.customer?.email}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>
                          {order.shipTo?.city}, {order.shipTo?.state} {order.shipTo?.zip}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-gray-400" />
                        <span>{order.package?.weight?.toFixed(1) || '?'} lbs</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-gray">
                        {order.package?.items?.length || 0} items
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
