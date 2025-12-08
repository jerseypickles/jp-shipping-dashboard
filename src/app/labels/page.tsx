'use client'

import { useState, useEffect } from 'react'
import { 
  Printer, 
  RefreshCw, 
  Download,
  CheckSquare,
  Square,
  Loader2,
  FileText,
  Truck,
  MapPin,
  X,
  ExternalLink,
  Image,
  CheckCircle,
  Clock,
  MinusSquare
} from 'lucide-react'
import { getPrintQueue, getShipments, markLabelsPrinted } from '@/lib/api'

interface Label {
  _id: string;
  orderNumber: string;
  trackingNumber: string;
  customer: string;
  destination: string;
  service: string;
  cost: string;
  status: string;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://jp-fulfillment-tracker-bcf083e55b7a.herokuapp.com';

export default function LabelsPage() {
  const [labels, setLabels] = useState<Label[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filter, setFilter] = useState<'to_print' | 'printed' | 'all'>('to_print')
  const [previewLabel, setPreviewLabel] = useState<string | null>(null)

  async function loadLabels() {
    setLoading(true)
    setError(null)
    
    try {
      let data;
      
      if (filter === 'to_print') {
        data = await getPrintQueue()
        setLabels(data.labels || [])
      } else {
        const params: any = { limit: 100 }
        if (filter === 'printed') {
          params.status = 'printed'
        }
        data = await getShipments(params)
        
        const shipments = data.shipments || []
        setLabels(shipments.filter((s: any) => 
          filter === 'all' 
            ? ['label_created', 'printed'].includes(s.status)
            : s.status === 'printed'
        ).map((s: any) => ({
          _id: s._id,
          orderNumber: s.orderNumber,
          trackingNumber: s.trackingNumber,
          customer: s.customer,
          destination: s.destination,
          service: s.service,
          cost: s.cost,
          status: s.status,
          createdAt: s.createdAt
        })))
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLabels()
  }, [filter])

  function toggleSelect(labelId: string) {
    const newSelected = new Set(selected)
    if (newSelected.has(labelId)) {
      newSelected.delete(labelId)
    } else {
      newSelected.add(labelId)
    }
    setSelected(newSelected)
  }

  function toggleSelectAll() {
    if (selected.size === labels.length && labels.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(labels.map(l => l._id)))
    }
  }

  async function handleMarkPrinted() {
    if (selected.size === 0) return
    
    // Only mark labels that are "label_created"
    const toMark = labels.filter(l => selected.has(l._id) && l.status === 'label_created')
    if (toMark.length === 0) {
      setError('No unprinted labels selected')
      return
    }
    
    setMarking(true)
    setError(null)
    
    try {
      await markLabelsPrinted(toMark.map(l => l._id))
      setSuccess(`Marked ${toMark.length} labels as printed`)
      setSelected(new Set())
      await loadLabels()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setMarking(false)
    }
  }

  async function handleBatchPrint(autoMark: boolean = false) {
    if (selected.size === 0) return
    
    setDownloading(true)
    setError(null)
    
    try {
      const selectedIds = Array.from(selected)
      
      // Use fetch + blob for POST request
      const response = await fetch(`${API_BASE}/api/labels/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentIds: selectedIds })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to get batch labels')
      }
      
      const html = await response.text()
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      
      // Auto-mark as printed if requested
      if (autoMark) {
        const toMark = labels.filter(l => selected.has(l._id) && l.status === 'label_created')
        if (toMark.length > 0) {
          await markLabelsPrinted(toMark.map(l => l._id))
          setSuccess(`Opened ${selected.size} labels for printing. Marked ${toMark.length} as printed.`)
          await loadLabels()
        } else {
          setSuccess(`Opened ${selected.size} labels for printing.`)
        }
      } else {
        setSuccess(`Opened ${selected.size} labels for printing.`)
      }
      
      setSelected(new Set())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDownloading(false)
    }
  }

  // =============================================
  // FIXED: Use fetch + blob instead of window.open directly
  // This avoids popup blocker issues
  // =============================================
  async function handlePrintAllQueue() {
    const toPrint = labels.filter(l => l.status === 'label_created')
    if (toPrint.length === 0) {
      setError('No labels to print')
      return
    }
    
    setDownloading(true)
    setError(null)
    
    try {
      // Use fetch + blob approach (same as handleBatchPrint) to avoid popup blocker
      const response = await fetch(`${API_BASE}/api/labels/queue/download`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to get print queue')
      }
      
      const html = await response.text()
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      
      // Mark all as printed
      await markLabelsPrinted(toPrint.map(l => l._id))
      setSuccess(`Opened ${toPrint.length} labels for printing and marked as printed`)
      setSelected(new Set())
      await loadLabels()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDownloading(false)
    }
  }

  function openLabelPreview(id: string) {
    setPreviewLabel(id)
  }

  // Selection state
  const allSelected = labels.length > 0 && selected.size === labels.length
  const someSelected = selected.size > 0 && selected.size < labels.length
  const selectedToPrint = labels.filter(l => selected.has(l._id) && l.status === 'label_created').length
  const selectedPrinted = labels.filter(l => selected.has(l._id) && l.status === 'printed').length

  const filters = [
    { value: 'to_print', label: 'To Print', icon: Clock },
    { value: 'printed', label: 'Printed', icon: CheckCircle },
    { value: 'all', label: 'All Labels', icon: FileText },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Labels</h1>
          <p className="text-gray-500 mt-1">
            {filter === 'to_print' && `${labels.length} labels ready to print`}
            {filter === 'printed' && `${labels.length} labels printed`}
            {filter === 'all' && `${labels.length} total labels`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadLabels}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {filter === 'to_print' && labels.length > 0 && (
            <button
              onClick={handlePrintAllQueue}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              Print All ({labels.length})
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-2">
        {filters.map((f) => {
          const Icon = f.icon
          return (
            <button
              key={f.value}
              onClick={() => {
                setFilter(f.value as any)
                setSelected(new Set())
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)}><X className="w-5 h-5 text-red-400" /></button>
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <span className="text-green-700">{success}</span>
          <button onClick={() => setSuccess(null)}><X className="w-5 h-5 text-green-400" /></button>
        </div>
      )}

      {/* Action Bar */}
      {selected.size > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-blue-800">
                {selected.size} label{selected.size > 1 ? 's' : ''} selected
              </span>
              {(selectedToPrint > 0 || selectedPrinted > 0) && (
                <span className="text-sm text-blue-600 ml-2">
                  ({selectedToPrint} to print, {selectedPrinted} already printed)
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Print Selected (opens in new window) */}
              <button
                onClick={() => handleBatchPrint(false)}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                Print Selected ({selected.size})
              </button>
              
              {/* Print & Mark (only if there are unprinted labels) */}
              {selectedToPrint > 0 && (
                <button
                  onClick={() => handleBatchPrint(true)}
                  disabled={downloading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {downloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4" />
                  )}
                  Print & Mark ({selectedToPrint})
                </button>
              )}
              
              {/* Just Mark as Printed (without opening print window) */}
              {selectedToPrint > 0 && (
                <button
                  onClick={handleMarkPrinted}
                  disabled={marking}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {marking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Mark Printed
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Labels Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
            <p className="mt-4 text-gray-500">Loading labels...</p>
          </div>
        ) : labels.length === 0 ? (
          <div className="p-12 text-center">
            <Printer className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {filter === 'to_print' && 'No labels to print'}
              {filter === 'printed' && 'No printed labels'}
              {filter === 'all' && 'No labels yet'}
            </h3>
            <p className="mt-2 text-gray-500">
              {filter === 'to_print' && 'Create labels from the Orders page'}
              {filter === 'printed' && 'Printed labels will appear here'}
              {filter === 'all' && 'Labels will appear here after you ship orders'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left w-12">
                    <button onClick={toggleSelectAll} className="p-1 hover:bg-gray-200 rounded">
                      {allSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : someSelected ? (
                        <MinusSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tracking</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Destination</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {labels.map((label) => {
                  const isPrinted = label.status === 'printed'
                  const isSelected = selected.has(label._id)
                  
                  return (
                    <tr 
                      key={label._id}
                      className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-4">
                        <button 
                          onClick={() => toggleSelect(label._id)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-gray-900">{label.orderNumber}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <a 
                          href={`https://www.ups.com/track?tracknum=${label.trackingNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline font-mono text-sm"
                        >
                          {label.trackingNumber?.substring(0, 14)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="px-4 py-4 text-gray-700">{label.customer}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {label.destination}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Truck className="w-4 h-4 text-gray-400" />
                          {label.service}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-medium text-gray-900">{label.cost}</td>
                      <td className="px-4 py-4">
                        {isPrinted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3" />
                            Printed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            <Clock className="w-3 h-3" />
                            To Print
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openLabelPreview(label._id)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="Preview"
                          >
                            <Image className="w-4 h-4" />
                          </button>
                          <a
                            href={`${API_BASE}/api/labels/${label._id}?format=html`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Print"
                          >
                            <Printer className="w-4 h-4" />
                          </a>
                          <a
                            href={`${API_BASE}/api/labels/${label._id}`}
                            download={`${label.orderNumber}-label.gif`}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Label Preview Modal */}
      {previewLabel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Label Preview</h3>
              <button 
                onClick={() => setPreviewLabel(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 text-center bg-gray-50">
              <img 
                src={`${API_BASE}/api/labels/${previewLabel}`}
                alt="Shipping Label"
                className="max-w-full mx-auto border border-gray-200 rounded shadow-sm"
                style={{ transform: 'rotate(90deg)', maxHeight: '300px' }}
              />
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <a
                href={`${API_BASE}/api/labels/${previewLabel}`}
                download="label.gif"
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
              <a
                href={`${API_BASE}/api/labels/${previewLabel}?format=html`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Printer className="w-4 h-4" />
                Print
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">📋 How to use:</h4>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li><strong>Print All</strong> - Opens all queue labels and marks them as printed</li>
          <li><strong>Select labels</strong> using checkboxes (click header checkbox to select all)</li>
          <li><strong>Print Selected</strong> - Opens batch print window (doesn&apos;t mark as printed)</li>
          <li><strong>Print &amp; Mark</strong> - Opens print window AND marks unprinted labels as printed</li>
          <li><strong>Mark Printed</strong> - Just marks as printed without opening print window</li>
          <li>Use filters to view <strong>To Print</strong>, <strong>Printed</strong>, or <strong>All</strong> labels</li>
        </ul>
      </div>
    </div>
  )
}