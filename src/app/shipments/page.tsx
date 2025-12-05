'use client'

import { useState, useEffect } from 'react'
import { 
  Truck, 
  RefreshCw, 
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  MapPin,
  ExternalLink,
  Loader2
} from 'lucide-react'
import { getShipments } from '@/lib/api'

interface Shipment {
  _id: string;
  orderNumber: string;
  trackingNumber: string;
  customer: { name: string };
  destination: string;
  service: string;
  cost: string;
  zone: number;
  status: string;
  createdAt: string;
}

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  label_created: { icon: Clock, color: 'badge-gray', label: 'Label Created' },
  printed: { icon: Package, color: 'badge-info', label: 'Printed' },
  shipped: { icon: Truck, color: 'badge-info', label: 'Shipped' },
  in_transit: { icon: Truck, color: 'badge-warning', label: 'In Transit' },
  out_for_delivery: { icon: Truck, color: 'badge-success', label: 'Out for Delivery' },
  delivered: { icon: CheckCircle, color: 'badge-success', label: 'Delivered' },
  exception: { icon: AlertCircle, color: 'badge-error', label: 'Exception' },
  voided: { icon: XCircle, color: 'badge-gray', label: 'Voided' },
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  async function loadShipments() {
    setLoading(true)
    setError(null)
    
    try {
      const params: any = { limit: 100 }
      if (filter !== 'all') params.status = filter
      
      const data = await getShipments(params)
      setShipments(data.shipments || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadShipments()
  }, [filter])

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'label_created', label: 'Label Created' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'voided', label: 'Voided' },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
          <p className="text-gray-500 mt-1">Track all your shipments</p>
        </div>
        <button
          onClick={loadShipments}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-pickle-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Shipments Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
            <p className="mt-4 text-gray-500">Loading shipments...</p>
          </div>
        ) : shipments.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="mt-4 text-gray-500">No shipments found</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Tracking</th>
                  <th>Customer</th>
                  <th>Destination</th>
                  <th>Service</th>
                  <th>Cost</th>
                  <th>Zone</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {shipments.map((shipment) => {
                  const status = statusConfig[shipment.status] || statusConfig.label_created
                  const StatusIcon = status.icon
                  
                  return (
                    <tr key={shipment._id}>
                      <td className="font-medium text-gray-900">{shipment.orderNumber}</td>
                      <td>
                        <a 
                          href={`https://www.ups.com/track?tracknum=${shipment.trackingNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline font-mono text-sm"
                        >
                          {shipment.trackingNumber?.substring(0, 12)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="text-gray-700">{shipment.customer?.name}</td>
                      <td>
                        <div className="flex items-center gap-1 text-gray-600">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {shipment.destination}
                        </div>
                      </td>
                      <td className="text-gray-700">{shipment.service}</td>
                      <td className="font-medium text-gray-900">{shipment.cost}</td>
                      <td>
                        <span className="badge badge-gray">Zone {shipment.zone}</span>
                      </td>
                      <td>
                        <span className={`badge ${status.color} flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="text-gray-500 text-sm">
                        {new Date(shipment.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
