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
  Loader2,
  Trash2,
  X,
  Eye,
  EyeOff,
  ArrowUpDown,
  Filter
} from 'lucide-react'
import { getShipments, voidLabel } from '@/lib/api'

interface Shipment {
  _id: string;
  orderNumber: string;
  trackingNumber: string;
  customer: string;
  destination: string;
  service: string;
  cost: string;
  costCents: number;
  zone: number;
  status: string;
  createdAt: string;
}

const statusConfig: Record<string, { icon: any; color: string; label: string; order: number }> = {
  pending: { icon: Clock, color: 'bg-gray-100 text-gray-700', label: 'Pending', order: 1 },
  label_created: { icon: Package, color: 'bg-blue-100 text-blue-700', label: 'Label Created', order: 2 },
  printed: { icon: Package, color: 'bg-indigo-100 text-indigo-700', label: 'Printed', order: 3 },
  shipped: { icon: Truck, color: 'bg-purple-100 text-purple-700', label: 'Picked Up', order: 4 },
  in_transit: { icon: Truck, color: 'bg-yellow-100 text-yellow-700', label: 'In Transit', order: 5 },
  out_for_delivery: { icon: Truck, color: 'bg-orange-100 text-orange-700', label: 'Out for Delivery', order: 6 },
  delivered: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Delivered', order: 7 },
  exception: { icon: AlertCircle, color: 'bg-red-100 text-red-700', label: 'Exception', order: 8 },
  voided: { icon: XCircle, color: 'bg-gray-100 text-gray-500', label: 'Voided', order: 9 },
}

type SortField = 'date' | 'order' | 'status' | 'cost'
type SortOrder = 'asc' | 'desc'

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('active') // Changed default to 'active'
  const [showVoided, setShowVoided] = useState(false)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  
  // Void modal state
  const [voidingShipment, setVoidingShipment] = useState<Shipment | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [isVoiding, setIsVoiding] = useState(false)

  async function loadShipments() {
    setLoading(true)
    setError(null)
    
    try {
      // Always fetch all, we filter client-side for better UX
      const data = await getShipments({ limit: 200 })
      setShipments(data.shipments || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadShipments()
  }, [])

  async function handleVoidLabel() {
    if (!voidingShipment) return
    
    setIsVoiding(true)
    setError(null)
    
    try {
      const result = await voidLabel(voidingShipment.trackingNumber, voidReason)
      
      const message = result.shopifyCancelled
        ? `Label ${voidingShipment.trackingNumber} voided. Order returned to pending.`
        : `Label ${voidingShipment.trackingNumber} voided. Note: May need manual Shopify update.`
      
      setSuccess(message)
      setVoidingShipment(null)
      setVoidReason('')
      
      // Refresh shipments
      await loadShipments()
      
    } catch (err: any) {
      setError(`Failed to void label: ${err.message}`)
    } finally {
      setIsVoiding(false)
    }
  }

  function canVoid(shipment: Shipment): boolean {
    return ['label_created', 'printed'].includes(shipment.status)
  }

  // Filter shipments
  const filteredShipments = shipments.filter(s => {
    // First apply voided filter
    if (!showVoided && s.status === 'voided') return false
    
    // Then apply status filter
    switch (filter) {
      case 'active':
        return !['delivered', 'voided'].includes(s.status)
      case 'label_created':
        return s.status === 'label_created'
      case 'printed':
        return s.status === 'printed'
      case 'in_transit':
        return ['in_transit', 'out_for_delivery', 'shipped'].includes(s.status)
      case 'delivered':
        return s.status === 'delivered'
      case 'exception':
        return s.status === 'exception'
      case 'voided':
        return s.status === 'voided'
      case 'all':
      default:
        return true
    }
  })

  // Sort shipments
  const sortedShipments = [...filteredShipments].sort((a, b) => {
    let comparison = 0
    
    switch (sortField) {
      case 'date':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case 'order':
        comparison = a.orderNumber.localeCompare(b.orderNumber)
        break
      case 'status':
        comparison = (statusConfig[a.status]?.order || 0) - (statusConfig[b.status]?.order || 0)
        break
      case 'cost':
        comparison = (a.costCents || 0) - (b.costCents || 0)
        break
    }
    
    return sortOrder === 'desc' ? -comparison : comparison
  })

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const filters = [
    { value: 'active', label: 'Active', count: shipments.filter(s => !['delivered', 'voided'].includes(s.status)).length },
    { value: 'label_created', label: 'Labels', count: shipments.filter(s => s.status === 'label_created').length },
    { value: 'printed', label: 'Printed', count: shipments.filter(s => s.status === 'printed').length },
    { value: 'in_transit', label: 'In Transit', count: shipments.filter(s => ['in_transit', 'out_for_delivery', 'shipped'].includes(s.status)).length },
    { value: 'delivered', label: 'Delivered', count: shipments.filter(s => s.status === 'delivered').length },
    { value: 'exception', label: 'Exceptions', count: shipments.filter(s => s.status === 'exception').length },
    { value: 'all', label: 'All', count: showVoided ? shipments.length : shipments.filter(s => s.status !== 'voided').length },
  ]

  // Calculate totals (excluding voided)
  const totalCost = shipments
    .filter(s => s.status !== 'voided')
    .reduce((sum, s) => sum + (s.costCents || 0), 0)
  
  const voidedCount = shipments.filter(s => s.status === 'voided').length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
          <p className="text-gray-500 mt-1">
            {sortedShipments.length} shipments shown · Total: ${(totalCost / 100).toFixed(2)}
            {voidedCount > 0 && !showVoided && (
              <span className="text-gray-400 ml-2">({voidedCount} voided hidden)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Show/Hide Voided Toggle */}
          <button
            onClick={() => setShowVoided(!showVoided)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showVoided 
                ? 'bg-gray-200 text-gray-700' 
                : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {showVoided ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showVoided ? 'Showing Voided' : 'Voided Hidden'}
          </button>
          
          <button
            onClick={loadShipments}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-pickle-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
                filter === f.value ? 'bg-pickle-500' : 'bg-gray-100'
              }`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
        
        {/* Show Voided filter only when showVoided is true */}
        {showVoided && (
          <button
            onClick={() => setFilter('voided')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'voided'
                ? 'bg-gray-600 text-white'
                : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            Voided
            <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
              filter === 'voided' ? 'bg-gray-500' : 'bg-gray-100'
            }`}>
              {voidedCount}
            </span>
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="text-red-700">{error}</div>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-5 h-5 text-red-400 hover:text-red-600" />
          </button>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <div className="text-green-700">{success}</div>
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <X className="w-5 h-5 text-green-400 hover:text-green-600" />
          </button>
        </div>
      )}

      {/* Shipments Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
            <p className="mt-4 text-gray-500">Loading shipments...</p>
          </div>
        ) : sortedShipments.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No shipments found</h3>
            <p className="mt-2 text-gray-500">
              {filter !== 'all' ? 'Try changing filters or ' : ''}Create labels from the Orders page
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button 
                      onClick={() => toggleSort('order')}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase hover:text-gray-900"
                    >
                      Order
                      <ArrowUpDown className={`w-3 h-3 ${sortField === 'order' ? 'text-pickle-600' : 'text-gray-400'}`} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tracking</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Destination</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Service</th>
                  <th className="px-4 py-3 text-left">
                    <button 
                      onClick={() => toggleSort('cost')}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase hover:text-gray-900"
                    >
                      Cost
                      <ArrowUpDown className={`w-3 h-3 ${sortField === 'cost' ? 'text-pickle-600' : 'text-gray-400'}`} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Zone</th>
                  <th className="px-4 py-3 text-left">
                    <button 
                      onClick={() => toggleSort('status')}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase hover:text-gray-900"
                    >
                      Status
                      <ArrowUpDown className={`w-3 h-3 ${sortField === 'status' ? 'text-pickle-600' : 'text-gray-400'}`} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button 
                      onClick={() => toggleSort('date')}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase hover:text-gray-900"
                    >
                      Date
                      <ArrowUpDown className={`w-3 h-3 ${sortField === 'date' ? 'text-pickle-600' : 'text-gray-400'}`} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedShipments.map((shipment) => {
                  const status = statusConfig[shipment.status] || statusConfig.label_created
                  const StatusIcon = status.icon
                  const isVoided = shipment.status === 'voided'
                  
                  return (
                    <tr 
                      key={shipment._id}
                      className={isVoided ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}
                    >
                      <td className="px-4 py-4">
                        <span className={`font-semibold ${isVoided ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {shipment.orderNumber}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <a 
                          href={`https://www.ups.com/track?tracknum=${shipment.trackingNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-1 font-mono text-sm ${
                            isVoided ? 'text-gray-400' : 'text-blue-600 hover:underline'
                          }`}
                        >
                          {shipment.trackingNumber?.substring(0, 14)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="px-4 py-4 text-gray-700">{shipment.customer}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-gray-600">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {shipment.destination}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-700 text-sm">{shipment.service}</td>
                      <td className="px-4 py-4">
                        <span className={`font-semibold ${isVoided ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {shipment.cost}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {shipment.zone ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            Zone {shipment.zone}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-500 text-sm">
                        {new Date(shipment.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-4">
                        {canVoid(shipment) && (
                          <button
                            onClick={() => setVoidingShipment(shipment)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Void this label"
                          >
                            <Trash2 className="w-4 h-4" />
                            Void
                          </button>
                        )}
                        {shipment.status === 'voided' && (
                          <span className="text-gray-400 text-sm">Voided</span>
                        )}
                        {!canVoid(shipment) && shipment.status !== 'voided' && (
                          <span className="text-gray-400 text-sm">-</span>
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

      {/* Void Confirmation Modal */}
      {voidingShipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Void Label</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">Order:</div>
                  <div className="font-medium">{voidingShipment.orderNumber}</div>
                  <div className="text-gray-500">Tracking:</div>
                  <div className="font-mono text-xs">{voidingShipment.trackingNumber}</div>
                  <div className="text-gray-500">Cost:</div>
                  <div className="font-medium">{voidingShipment.cost}</div>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for voiding (optional)
                </label>
                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g., Customer cancelled order"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> UPS may take a few minutes to process the void. 
                  If it fails, wait 5-10 minutes and try again.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t">
              <button
                onClick={() => {
                  setVoidingShipment(null)
                  setVoidReason('')
                }}
                disabled={isVoiding}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVoidLabel}
                disabled={isVoiding}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isVoiding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {isVoiding ? 'Voiding...' : 'Void Label'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Summary Footer */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-500">
            Showing {sortedShipments.length} of {shipments.length} shipments
            {!showVoided && voidedCount > 0 && (
              <span className="ml-2">
                · <button onClick={() => setShowVoided(true)} className="text-pickle-600 hover:underline">
                  Show {voidedCount} voided
                </button>
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-gray-500">
              Sort: <span className="font-medium text-gray-700 capitalize">{sortField}</span> ({sortOrder === 'desc' ? 'newest' : 'oldest'})
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}