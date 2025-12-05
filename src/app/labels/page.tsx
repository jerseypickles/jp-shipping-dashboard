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
  MapPin
} from 'lucide-react'
import { getPrintQueue, markLabelsPrinted, getBatchLabelsUrl } from '@/lib/api'

interface Label {
  _id: string;
  orderNumber: string;
  trackingNumber: string;
  customer: string;
  destination: string;
  service: string;
  createdAt: string;
}

export default function LabelsPage() {
  const [labels, setLabels] = useState<Label[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadLabels() {
    setLoading(true)
    setError(null)
    
    try {
      const data = await getPrintQueue()
      setLabels(data.labels || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLabels()
  }, [])

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
    if (selected.size === labels.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(labels.map(l => l._id)))
    }
  }

  async function handleMarkPrinted() {
    if (selected.size === 0) return
    
    setMarking(true)
    setError(null)
    
    try {
      await markLabelsPrinted(Array.from(selected))
      await loadLabels()
      setSelected(new Set())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setMarking(false)
    }
  }

  function handleDownloadAll() {
    window.open(getBatchLabelsUrl(), '_blank')
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Print Queue</h1>
          <p className="text-gray-500 mt-1">{labels.length} labels ready to print</p>
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
          {labels.length > 0 && (
            <button
              onClick={handleDownloadAll}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download All (ZPL)
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Action Bar */}
      {selected.size > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
          <span className="font-medium text-blue-800">
            {selected.size} label{selected.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleMarkPrinted}
            disabled={marking}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {marking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            Mark as Printed
          </button>
        </div>
      )}

      {/* Labels Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
            <p className="mt-4 text-gray-500">Loading print queue...</p>
          </div>
        ) : labels.length === 0 ? (
          <div className="p-12 text-center">
            <Printer className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="mt-4 text-gray-500">No labels in print queue</p>
            <p className="text-sm text-gray-400 mt-1">Labels will appear here after you ship orders</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th className="w-12">
                    <button onClick={toggleSelectAll} className="p-1">
                      {selected.size === labels.length ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th>Order</th>
                  <th>Tracking</th>
                  <th>Customer</th>
                  <th>Destination</th>
                  <th>Service</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {labels.map((label) => (
                  <tr 
                    key={label._id}
                    className={selected.has(label._id) ? 'bg-blue-50' : ''}
                  >
                    <td>
                      <button 
                        onClick={() => toggleSelect(label._id)}
                        className="p-1"
                      >
                        {selected.has(label._id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{label.orderNumber}</span>
                      </div>
                    </td>
                    <td>
                      <a 
                        href={`https://www.ups.com/track?tracknum=${label.trackingNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-mono text-sm"
                      >
                        {label.trackingNumber}
                      </a>
                    </td>
                    <td className="text-gray-700">{label.customer}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{label.destination}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-gray-400" />
                        <span>{label.service}</span>
                      </div>
                    </td>
                    <td className="text-gray-500 text-sm">
                      {new Date(label.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print Instructions */}
      {labels.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-2">Print Instructions</h3>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Click "Download All (ZPL)" to get the label file</li>
            <li>Send the ZPL file to your Zebra thermal printer</li>
            <li>Select printed labels and click "Mark as Printed"</li>
          </ol>
        </div>
      )}
    </div>
  )
}
