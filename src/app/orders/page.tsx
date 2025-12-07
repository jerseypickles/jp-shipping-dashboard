'use client'

import { useState, useEffect, Fragment, useMemo } from 'react'
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
  TrendingUp,
  Search,
  Filter,
  Calendar,
  XCircle,
  Box
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
  originalPackage: {
    weight: number;
    length: number;
    width: number;
    height: number;
  };
  package: {
    weight: number;
    length: number;
    width: number;
    height: number;
  };
}

interface Filters {
  search: string;
  dateFrom: string;
  dateTo: string;
  state: string;
  hasRate: 'all' | 'with' | 'without' | 'error';
  weightMin: string;
  weightMax: string;
  hasBYB: 'all' | 'yes' | 'no';
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]

// Helper function to detect BYB orders
function isBYBOrder(items: OrderItem[]): boolean {
  if (!items || items.length === 0) return false
  return items.some(item => {
    const name = (item.name || '').toLowerCase()
    return name.includes('build your') || 
           name.includes('build-your') || 
           name.includes('byb') ||
           name.includes('custom box') ||
           name.includes('build box')
  })
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
  
  // Search & Filter state
  const [filters, setFilters] = useState<Filters>({
    search: '',
    dateFrom: '',
    dateTo: '',
    state: '',
    hasRate: 'all',
    weightMin: '',
    weightMax: '',
    hasBYB: 'all'
  })
  const [showFilters, setShowFilters] = useState(false)

  // Count BYB orders
  const bybCount = useMemo(() => {
    return orders.filter(o => isBYBOrder(o.items)).length
  }, [orders])

  // Filter orders locally
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase().trim()
        const searchableFields = [
          order.orderNumber,
          order.customer?.name,
          order.customer?.email,
          order.shipTo?.name,
          order.shipTo?.city,
          order.shipTo?.state,
          order.shipTo?.zip,
          order.shipTo?.street1,
          ...(order.items?.map(i => i.name) || []),
          ...(order.items?.map(i => i.sku) || [])
        ].filter(Boolean).map(s => s?.toLowerCase())
        
        if (!searchableFields.some(field => field?.includes(searchLower))) {
          return false
        }
      }
      
      // Date from filter
      if (filters.dateFrom) {
        const orderDate = new Date(order.orderDate)
        const fromDate = new Date(filters.dateFrom)
        fromDate.setHours(0, 0, 0, 0)
        if (orderDate < fromDate) return false
      }
      
      // Date to filter
      if (filters.dateTo) {
        const orderDate = new Date(order.orderDate)
        const toDate = new Date(filters.dateTo)
        toDate.setHours(23, 59, 59, 999)
        if (orderDate > toDate) return false
      }
      
      // State filter
      if (filters.state && order.shipTo?.state !== filters.state) {
        return false
      }
      
      // Rate status filter
      if (filters.hasRate !== 'all') {
        const orderRate = rates[order.shopifyOrderId]
        if (filters.hasRate === 'with' && !orderRate?.rate) return false
        if (filters.hasRate === 'without' && (orderRate?.rate || orderRate?.error)) return false
        if (filters.hasRate === 'error' && !orderRate?.error) return false
      }
      
      // Weight min filter
      if (filters.weightMin) {
        const minWeight = parseFloat(filters.weightMin)
        if (!isNaN(minWeight) && (order.package?.weight || 0) < minWeight) return false
      }
      
      // Weight max filter
      if (filters.weightMax) {
        const maxWeight = parseFloat(filters.weightMax)
        if (!isNaN(maxWeight) && (order.package?.weight || 0) > maxWeight) return false
      }
      
      // BYB filter
      if (filters.hasBYB !== 'all') {
        const orderHasBYB = isBYBOrder(order.items)
        if (filters.hasBYB === 'yes' && !orderHasBYB) return false
        if (filters.hasBYB === 'no' && orderHasBYB) return false
      }
      
      return true
    })
  }, [orders, filters, rates])
  
  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.dateFrom) count++
    if (filters.dateTo) count++
    if (filters.state) count++
    if (filters.hasRate !== 'all') count++
    if (filters.weightMin) count++
    if (filters.weightMax) count++
    if (filters.hasBYB !== 'all') count++
    return count
  }, [filters])
  
  // Clear all filters
  function clearFilters() {
    setFilters({
      search: '',
      dateFrom: '',
      dateTo: '',
      state: '',
      hasRate: 'all',
      weightMin: '',
      weightMax: '',
      hasBYB: 'all'
    })
  }

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
    // Select/deselect only filtered orders
    const filteredIds = new Set(filteredOrders.map(o => o.shopifyOrderId))
    const allFilteredSelected = filteredOrders.every(o => selected.has(o.shopifyOrderId))
    
    if (allFilteredSelected) {
      // Deselect all filtered
      const newSelected = new Set(selected)
      filteredIds.forEach(id => newSelected.delete(id))
      setSelected(newSelected)
    } else {
      // Select all filtered
      const newSelected = new Set(selected)
      filteredIds.forEach(id => newSelected.add(id))
      setSelected(newSelected)
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
    
    const packageData = {
      weight: order.package?.weight || 1,
      length: order.package?.length || 12,
      width: order.package?.width || 12,
      height: order.package?.height || 12
    }
    
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
      originalPackage: { ...packageData },
      package: { ...packageData }
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
  
  function hasPackageChanged(): boolean {
    if (!editingAddress) return false
    const orig = editingAddress.originalPackage
    const curr = editingAddress.package
    return (
      orig.weight !== curr.weight ||
      orig.length !== curr.length ||
      orig.width !== curr.width ||
      orig.height !== curr.height
    )
  }
  
  function hasAnyChanges(): boolean {
    return hasAddressChanged() || hasPackageChanged()
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
    
    const addressChanged = hasAddressChanged()
    const packageChanged = hasPackageChanged()
    
    let text = `Order: ${editingAddress.orderNumber}\n`
    
    if (addressChanged && packageChanged) {
      text += `Address & Package Change Request\n\n`
    } else if (addressChanged) {
      text += `Address Change Request\n\n`
    } else {
      text += `Package Change Request\n\n`
    }
    
    if (addressChanged) {
      text += `Original Address:\n`
      text += `${editingAddress.originalShipTo.street1}${editingAddress.originalShipTo.street2 ? ', ' + editingAddress.originalShipTo.street2 : ''}\n`
      text += `${editingAddress.originalShipTo.city}, ${editingAddress.originalShipTo.state} ${editingAddress.originalShipTo.zip}\n\n`
      text += `New Address:\n`
      text += `${editingAddress.shipTo.street1}${editingAddress.shipTo.street2 ? ', ' + editingAddress.shipTo.street2 : ''}\n`
      text += `${editingAddress.shipTo.city}, ${editingAddress.shipTo.state} ${editingAddress.shipTo.zip}\n\n`
    }
    
    if (packageChanged) {
      text += `Original Package: ${editingAddress.originalPackage.weight} lbs, ${editingAddress.originalPackage.length}×${editingAddress.originalPackage.width}×${editingAddress.originalPackage.height}"\n`
      text += `New Package: ${editingAddress.package.weight} lbs, ${editingAddress.package.length}×${editingAddress.package.width}×${editingAddress.package.height}"\n\n`
    }
    
    text += `Original Shipping Paid: $${(customerPaid / 100).toFixed(2)}\n`
    text += `New Shipping Cost: $${(newRate / 100).toFixed(2)}\n`
    text += `Additional Charge: $${(additionalCost / 100).toFixed(2)}\n\n`
    text += `Please send payment of $${(additionalCost / 100).toFixed(2)} to proceed with the changes.`
    
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
          },
          package: {
            ...editingAddress.package
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
    const packageChanged = hasPackageChanged()
    
    if ((addressChanged || packageChanged) && editingAddress.newRate !== null) {
      const profit = editingAddress.customerPaid - editingAddress.newRate
      const changeType = addressChanged && packageChanged ? 'Address & package' : addressChanged ? 'Address' : 'Package'
      if (profit < 0) {
        setSuccess(`⚠️ ${changeType} updated for ${editingAddress.orderNumber}. Loss: $${Math.abs(profit / 100).toFixed(2)}`)
      } else {
        setSuccess(`✓ ${changeType} updated for ${editingAddress.orderNumber}. New rate: $${(editingAddress.newRate / 100).toFixed(2)}`)
      }
    } else if (addressChanged || packageChanged) {
      setSuccess(`✓ Order ${editingAddress.orderNumber} updated.`)
    } else {
      setSuccess(`✓ No changes made.`)
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

  // Use filtered orders for calculations
  const selectedOrders = filteredOrders.filter(o => selected.has(o.shopifyOrderId))
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
  const packageChanged = editingAddress ? hasPackageChanged() : false
  const anyChanges = editingAddress ? hasAnyChanges() : false
  const canCalculateRate = editingAddress && editingAddress.shipTo.zip && editingAddress.shipTo.zip.length >= 5
  
  // Check if all filtered orders are selected
  const allFilteredSelected = filteredOrders.length > 0 && filteredOrders.every(o => selected.has(o.shopifyOrderId))
  const someFilteredSelected = filteredOrders.some(o => selected.has(o.shopifyOrderId))

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Orders</h1>
          <p className="text-gray-500 mt-1">
            {pagination ? `${pagination.total} orders total` : `${orders.length} orders`}
            {pagination && pagination.totalPages > 1 && ` • Page ${pagination.page} of ${pagination.totalPages}`}
            {filteredOrders.length !== orders.length && (
              <span className="text-pickle-600 font-medium"> • {filteredOrders.length} shown</span>
            )}
            {bybCount > 0 && (
              <span className="text-purple-600 font-medium"> • {bybCount} BYB</span>
            )}
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
      
      {/* Search & Filter Bar */}
      <div className="mb-6 space-y-3">
        {/* Search Row */}
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order #, customer name, email, city, ZIP, SKU..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
            />
            {filters.search && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* BYB Quick Filter */}
          {bybCount > 0 && (
            <button
              onClick={() => setFilters(prev => ({ 
                ...prev, 
                hasBYB: prev.hasBYB === 'yes' ? 'all' : 'yes' 
              }))}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                filters.hasBYB === 'yes'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white border border-purple-200 text-purple-700 hover:bg-purple-50'
              }`}
            >
              <Box className="w-4 h-4" />
              BYB
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                filters.hasBYB === 'yes' ? 'bg-purple-500' : 'bg-purple-100'
              }`}>
                {bybCount}
              </span>
            </button>
          )}
          
          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-pickle-50 border-pickle-300 text-pickle-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 text-xs font-bold bg-pickle-600 text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
          
          {/* Clear All Filters */}
          {(filters.search || activeFilterCount > 0) && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
        
        {/* Expanded Filters */}
        {showFilters && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {/* Date From */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date From</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-pickle-500"
                  />
                </div>
              </div>
              
              {/* Date To */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date To</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-pickle-500"
                  />
                </div>
              </div>
              
              {/* State */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ship to State</label>
                <select
                  value={filters.state}
                  onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-pickle-500 bg-white"
                >
                  <option value="">All States</option>
                  {US_STATES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              
              {/* Rate Status */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rate Status</label>
                <select
                  value={filters.hasRate}
                  onChange={(e) => setFilters(prev => ({ ...prev, hasRate: e.target.value as Filters['hasRate'] }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-pickle-500 bg-white"
                >
                  <option value="all">All Orders</option>
                  <option value="with">With Rate</option>
                  <option value="without">Without Rate</option>
                  <option value="error">Rate Error</option>
                </select>
              </div>
              
              {/* Weight Min */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Weight Min (lbs)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={filters.weightMin}
                  onChange={(e) => setFilters(prev => ({ ...prev, weightMin: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-pickle-500"
                />
              </div>
              
              {/* Weight Max */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Weight Max (lbs)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="∞"
                  value={filters.weightMax}
                  onChange={(e) => setFilters(prev => ({ ...prev, weightMax: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-pickle-500"
                />
              </div>
              
              {/* BYB Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Build Your Box</label>
                <select
                  value={filters.hasBYB}
                  onChange={(e) => setFilters(prev => ({ ...prev, hasBYB: e.target.value as Filters['hasBYB'] }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-pickle-500 bg-white"
                >
                  <option value="all">All Orders</option>
                  <option value="yes">BYB Only</option>
                  <option value="no">Non-BYB</option>
                </select>
              </div>
            </div>
            
            {/* Quick Filters */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 mr-2">Quick:</span>
              <button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0]
                  setFilters(prev => ({ ...prev, dateFrom: today, dateTo: today }))
                }}
                className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-full hover:bg-gray-50"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const today = new Date()
                  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                  setFilters(prev => ({ 
                    ...prev, 
                    dateFrom: weekAgo.toISOString().split('T')[0], 
                    dateTo: today.toISOString().split('T')[0] 
                  }))
                }}
                className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-full hover:bg-gray-50"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, state: 'NJ' }))}
                className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-full hover:bg-gray-50"
              >
                New Jersey
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, state: 'NY' }))}
                className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-full hover:bg-gray-50"
              >
                New York
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, state: 'PA' }))}
                className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-full hover:bg-gray-50"
              >
                Pennsylvania
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, weightMin: '5' }))}
                className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-full hover:bg-gray-50"
              >
                Heavy (5+ lbs)
              </button>
              {bybCount > 0 && (
                <button
                  onClick={() => setFilters(prev => ({ ...prev, hasBYB: 'yes' }))}
                  className="px-3 py-1 text-xs bg-purple-100 border border-purple-200 text-purple-700 rounded-full hover:bg-purple-200 flex items-center gap-1"
                >
                  <Box className="w-3 h-3" />
                  BYB Only
                </button>
              )}
            </div>
          </div>
        )}
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
                {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected
                {selectedOrders.length !== selected.size && (
                  <span className="text-pickle-600 text-sm font-normal ml-1">
                    ({selected.size} total, {selected.size - selectedOrders.length} filtered out)
                  </span>
                )}
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
                {shipping ? 'Creating...' : `Ship ${selectedOrders.length}`}
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
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {orders.length === 0 ? 'No pending orders' : 'No orders match filters'}
            </h3>
            <p className="mt-2 text-gray-500">
              {orders.length === 0 
                ? 'All orders have been fulfilled!' 
                : 'Try adjusting your search or filters'}
            </p>
            {orders.length > 0 && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 text-pickle-600 hover:bg-pickle-50 rounded-lg transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left w-12">
                    <button onClick={toggleSelectAll} className="p-1 hover:bg-gray-200 rounded">
                      {allFilteredSelected ? (
                        <CheckSquare className="w-5 h-5 text-pickle-600" />
                      ) : someFilteredSelected ? (
                        <div className="w-5 h-5 border-2 border-pickle-600 rounded bg-pickle-100 flex items-center justify-center">
                          <div className="w-2 h-0.5 bg-pickle-600"></div>
                        </div>
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
                {filteredOrders.map((order) => {
                  const orderRate = rates[order.shopifyOrderId]
                  const hasShipTo = order.shipTo && order.shipTo.zip
                  const isExpanded = expandedOrders.has(order.shopifyOrderId)
                  const hasBYB = isBYBOrder(order.items)
                  
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
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-gray-900">{order.orderNumber}</div>
                            {hasBYB && (
                              <span 
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700"
                                title="Build Your Box"
                              >
                                <Box className="w-2.5 h-2.5" />
                                BYB
                              </span>
                            )}
                          </div>
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
                                <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-700">📦 Products in Order {order.orderNumber}</span>
                                  {hasBYB && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                                      <Box className="w-2.5 h-2.5" />
                                      BYB
                                    </span>
                                  )}
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
                                      order.items.map((item, idx) => {
                                        const itemIsBYB = (item.name || '').toLowerCase().includes('build your') || 
                                                         (item.name || '').toLowerCase().includes('build-your') ||
                                                         (item.name || '').toLowerCase().includes('byb')
                                        return (
                                          <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                              <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900">{item.name || 'Unknown Product'}</span>
                                                {itemIsBYB && (
                                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                                                    <Box className="w-2.5 h-2.5" />
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                            <td className="px-4 py-3"><span className="text-sm text-gray-500 font-mono">{item.sku || '-'}</span></td>
                                            <td className="px-4 py-3"><span className="text-sm text-gray-500">{item.variant_title || '-'}</span></td>
                                            <td className="px-4 py-3 text-center">
                                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-pickle-100 text-pickle-700 font-semibold text-sm">{item.quantity}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                              <span className="font-medium text-gray-900">{item.price ? `$${parseFloat(item.price).toFixed(2)}` : '-'}</span>
                                            </td>
                                          </tr>
                                        )
                                      })
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
            {filteredOrders.length !== orders.length && (
              <span className="text-pickle-600"> ({filteredOrders.length} after filters)</span>
            )}
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
            <strong>💡 Tips:</strong> Use search to find orders by #, customer, email, city or SKU. Click ▼ to see products. Click ✏️ to edit address. <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700"><Box className="w-2.5 h-2.5" />BYB</span> = Build Your Box orders.
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
                <Edit3 className="w-5 h-5" />
                <span className="font-semibold">Edit Order - {editingAddress.orderNumber}</span>
              </div>
              <button onClick={() => setEditingAddress(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Address Section Header */}
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-5 h-5 text-gray-600" />
                <span className="font-semibold text-gray-800">Shipping Address</span>
              </div>
              
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
              
              {/* Package Section */}
              <div className="pt-4 mt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-5 h-5 text-gray-600" />
                  <span className="font-semibold text-gray-800">Package Details</span>
                </div>
                
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Weight (lbs) *</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="0.1"
                      value={editingAddress.package.weight}
                      onChange={(e) => setEditingAddress({ 
                        ...editingAddress, 
                        package: { ...editingAddress.package, weight: parseFloat(e.target.value) || 0 },
                        newRate: null,
                        newRateError: null
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Length (in)</label>
                    <input 
                      type="number" 
                      step="1"
                      min="1"
                      value={editingAddress.package.length}
                      onChange={(e) => setEditingAddress({ 
                        ...editingAddress, 
                        package: { ...editingAddress.package, length: parseInt(e.target.value) || 0 },
                        newRate: null,
                        newRateError: null
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Width (in)</label>
                    <input 
                      type="number" 
                      step="1"
                      min="1"
                      value={editingAddress.package.width}
                      onChange={(e) => setEditingAddress({ 
                        ...editingAddress, 
                        package: { ...editingAddress.package, width: parseInt(e.target.value) || 0 },
                        newRate: null,
                        newRateError: null
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Height (in)</label>
                    <input 
                      type="number" 
                      step="1"
                      min="1"
                      value={editingAddress.package.height}
                      onChange={(e) => setEditingAddress({ 
                        ...editingAddress, 
                        package: { ...editingAddress.package, height: parseInt(e.target.value) || 0 },
                        newRate: null,
                        newRateError: null
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
                    />
                  </div>
                </div>
                
                {/* Show original values if changed */}
                {packageChanged && (
                  <div className="mt-2 text-xs text-gray-500">
                    Original: {editingAddress.originalPackage.weight} lbs, {editingAddress.originalPackage.length}×{editingAddress.originalPackage.width}×{editingAddress.originalPackage.height} in
                  </div>
                )}
              </div>
              
              {/* Calculate Rate Button */}
              {anyChanges && canCalculateRate && (
                <div className="pt-2">
                  <button onClick={calculateNewRate} disabled={editingAddress.newRateLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium">
                    {editingAddress.newRateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                    {editingAddress.newRateLoading ? 'Calculating...' : 'Calculate New Rate'}
                  </button>
                  {(addressChanged || packageChanged) && (
                    <p className="mt-2 text-xs text-gray-500">
                      {addressChanged && packageChanged ? '📍 Address & 📦 Package changed' : 
                       addressChanged ? '📍 Address changed' : '📦 Package changed'}
                    </p>
                  )}
                </div>
              )}
              
              {/* Cost Comparison Box */}
              {anyChanges && (editingAddress.newRate !== null || editingAddress.newRateError) && (
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
                      {/* Changes Summary */}
                      <div className="grid grid-cols-2 gap-4 pb-3 border-b border-gray-200">
                        {addressChanged && (
                          <>
                            <div>
                              <div className="text-gray-500 text-xs uppercase mb-1">📍 Original Address</div>
                              <div className="font-medium">{editingAddress.originalShipTo.city}, {editingAddress.originalShipTo.state} {editingAddress.originalShipTo.zip}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-xs uppercase mb-1">📍 New Address</div>
                              <div className="font-medium">{editingAddress.shipTo.city}, {editingAddress.shipTo.state} {editingAddress.shipTo.zip}</div>
                            </div>
                          </>
                        )}
                        {packageChanged && (
                          <>
                            <div>
                              <div className="text-gray-500 text-xs uppercase mb-1">📦 Original Package</div>
                              <div className="font-medium">{editingAddress.originalPackage.weight} lbs, {editingAddress.originalPackage.length}×{editingAddress.originalPackage.width}×{editingAddress.originalPackage.height}&quot;</div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-xs uppercase mb-1">📦 New Package</div>
                              <div className="font-medium">{editingAddress.package.weight} lbs, {editingAddress.package.length}×{editingAddress.package.width}×{editingAddress.package.height}&quot;</div>
                            </div>
                          </>
                        )}
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
              {anyChanges && editingAddress.newRate === null && !editingAddress.newRateLoading && !editingAddress.newRateError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">
                    ⚠️ <strong>{addressChanged && packageChanged ? 'Address & package changed!' : addressChanged ? 'Address changed!' : 'Package changed!'}</strong> Click &quot;Calculate New Rate&quot; to see shipping cost before saving.
                  </p>
                </div>
              )}
              
              {/* Standard info when no changes */}
              {!anyChanges && (
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
                  {anyChanges && editingAddress.newRate !== null && (editingAddress.customerPaid - editingAddress.newRate) < 0 && (
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
                  
                  {anyChanges && editingAddress.newRate !== null && (editingAddress.customerPaid - editingAddress.newRate) < 0 ? (
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
                      {anyChanges && editingAddress.newRate === null ? 'Save (Rate Unknown)' : 'Save Changes'}
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