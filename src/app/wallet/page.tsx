'use client'

import { useState, useEffect } from 'react'
import { 
  Wallet, 
  RefreshCw, 
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Loader2,
  Receipt
} from 'lucide-react'
import { getWalletSummary, getWalletTransactions, getWalletAnalytics } from '@/lib/api'

interface Transaction {
  _id: string;
  type: 'credit' | 'debit' | 'refund';
  amount: number;
  description: string;
  createdAt: string;
  debit?: {
    orderNumber: string;
    trackingNumber: string;
    service: string;
  };
}

interface WalletSummary {
  currentPeriod: {
    spent: number;
    spentFormatted: string;
    labels: number;
    startDate: string;
    projectedInvoice: number;
    projectedFormatted: string;
  };
  stats: {
    totalSpent: number;
    totalLabels: number;
    totalRefunds: number;
  };
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)
    
    try {
      const [walletData, txData] = await Promise.all([
        getWalletSummary(),
        getWalletTransactions({ limit: 50 }),
      ])
      
      setWallet(walletData)
      setTransactions(txData.transactions || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const typeConfig = {
    debit: { icon: ArrowUpRight, color: 'text-red-600', bg: 'bg-red-100', label: 'Label' },
    credit: { icon: ArrowDownRight, color: 'text-green-600', bg: 'bg-green-100', label: 'Credit' },
    refund: { icon: RotateCcw, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Refund' },
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Tracker</h1>
          <p className="text-gray-500 mt-1">Track your UPS shipping expenses</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Weekly Summary Card */}
      {wallet && (
        <div className="bg-gradient-to-r from-pickle-600 to-pickle-700 rounded-xl p-6 text-white mb-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-pickle-100 font-medium">This Week</p>
              <p className="text-4xl font-bold mt-2">
                {wallet.currentPeriod.spentFormatted}
              </p>
              <p className="text-pickle-200 mt-1">
                {wallet.currentPeriod.labels} labels
              </p>
            </div>
            <div className="text-right">
              <p className="text-pickle-100 font-medium">Projected UPS Invoice</p>
              <p className="text-3xl font-bold mt-2">
                {wallet.currentPeriod.projectedFormatted}
              </p>
              <p className="text-pickle-200 text-sm mt-1">
                Includes ~8% fuel surcharge
              </p>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-pickle-500 flex items-center justify-between text-sm">
            <span className="text-pickle-200">
              Week started: {new Date(wallet.currentPeriod.startDate).toLocaleDateString()}
            </span>
            <span className="text-pickle-200">
              Avg per label: ${wallet.currentPeriod.labels > 0 
                ? (wallet.currentPeriod.spent / wallet.currentPeriod.labels / 100).toFixed(2) 
                : '0.00'}
            </span>
          </div>
        </div>
      )}

      {/* Stats */}
      {wallet && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-gray-500 font-medium">All-Time Spent</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${(wallet.stats.totalSpent / 100).toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Receipt className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-gray-500 font-medium">All-Time Labels</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {wallet.stats.totalLabels}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <RotateCcw className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-gray-500 font-medium">Total Refunds</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${(wallet.stats.totalRefunds / 100).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
        </div>
        
        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="mt-4 text-gray-500">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((tx) => {
              const config = typeConfig[tx.type]
              const Icon = config.icon
              
              return (
                <div key={tx._id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${config.bg}`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{tx.description}</p>
                      <p className="text-sm text-gray-500">
                        {tx.debit?.orderNumber && (
                          <span className="mr-2">{tx.debit.orderNumber}</span>
                        )}
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${tx.type === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
                      {tx.type === 'debit' ? '-' : '+'}${(tx.amount / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">{config.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h3 className="font-medium text-blue-900 mb-2">How This Works</h3>
        <p className="text-sm text-blue-700">
          This tracker records all your label purchases. UPS still bills you weekly as usual, 
          but now you can see exactly what to expect on your invoice before it arrives. 
          The "Projected Invoice" includes an estimated 8% fuel surcharge.
        </p>
      </div>
    </div>
  )
}
