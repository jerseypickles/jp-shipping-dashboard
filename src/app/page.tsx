'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Package, 
  Printer, 
  DollarSign, 
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Truck,
  Clock
} from 'lucide-react'
import { getDashboard, getWalletSummary, getFulfillmentStatus } from '@/lib/api'

interface DashboardData {
  wallet: { balance: number; formatted: string };
  today: { labels: number; spent: number; spentFormatted: string };
  printQueue: number;
  pendingOrders: number;
  week: {
    labels: number;
    spent: number;
    spentFormatted: string;
    projectedInvoice: number;
    projectedFormatted: string;
  };
}

interface WalletData {
  currentPeriod: {
    spent: number;
    spentFormatted: string;
    labels: number;
    projectedInvoice: number;
    projectedFormatted: string;
  };
}

interface FulfillmentData {
  level: string;
  stats: {
    totalUnfulfilled: number;
  };
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = 'gray',
  href 
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color?: 'gray' | 'green' | 'blue' | 'yellow' | 'red';
  href?: string;
}) {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
  }

  const content = (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {href && (
        <div className="mt-4 flex items-center text-sm text-pickle-600 font-medium">
          View details
          <ArrowRight className="w-4 h-4 ml-1" />
        </div>
      )}
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [fulfillment, setFulfillment] = useState<FulfillmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)
    
    try {
      const [dashboardData, walletData, fulfillmentData] = await Promise.all([
        getDashboard().catch(() => null),
        getWalletSummary().catch(() => null),
        getFulfillmentStatus().catch(() => null),
      ])
      
      setDashboard(dashboardData)
      setWallet(walletData)
      setFulfillment(fulfillmentData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-36 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const weekSpent = wallet?.currentPeriod?.spent || dashboard?.week?.spent || 0
  const weekLabels = wallet?.currentPeriod?.labels || dashboard?.week?.labels || 0
  const projected = wallet?.currentPeriod?.projectedInvoice || dashboard?.week?.projectedInvoice || 0

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome to JP Shipping Hub</p>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Pending Orders"
          value={dashboard?.pendingOrders || fulfillment?.stats?.totalUnfulfilled || 0}
          subtitle="Ready to ship"
          icon={Package}
          color="blue"
          href="/orders"
        />
        <StatCard
          title="Print Queue"
          value={dashboard?.printQueue || 0}
          subtitle="Labels to print"
          icon={Printer}
          color="yellow"
          href="/labels"
        />
        <StatCard
          title="This Week"
          value={`$${(weekSpent / 100).toFixed(2)}`}
          subtitle={`${weekLabels} labels`}
          icon={DollarSign}
          color="green"
          href="/wallet"
        />
        <StatCard
          title="Projected Invoice"
          value={`$${(projected / 100).toFixed(2)}`}
          subtitle="Est. UPS bill (with fuel)"
          icon={TrendingUp}
          color="gray"
          href="/analytics"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Today's Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Activity</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-gray-700">Labels Created</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                {dashboard?.today?.labels || 0}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-gray-700">Spent Today</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                {dashboard?.today?.spentFormatted || '$0.00'}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <span className="text-gray-700">Fulfillment Status</span>
              </div>
              <span className={`badge ${
                fulfillment?.level === 'normal' ? 'badge-success' :
                fulfillment?.level === 'busy' ? 'badge-warning' : 'badge-error'
              }`}>
                {fulfillment?.level || 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/orders"
              className="flex flex-col items-center justify-center p-6 bg-pickle-50 rounded-xl hover:bg-pickle-100 transition-colors"
            >
              <Package className="w-8 h-8 text-pickle-600 mb-2" />
              <span className="font-medium text-pickle-700">Ship Orders</span>
            </Link>
            <Link
              href="/labels"
              className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <Printer className="w-8 h-8 text-blue-600 mb-2" />
              <span className="font-medium text-blue-700">Print Labels</span>
            </Link>
            <Link
              href="/shipments"
              className="flex flex-col items-center justify-center p-6 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
            >
              <Truck className="w-8 h-8 text-purple-600 mb-2" />
              <span className="font-medium text-purple-700">Track Shipments</span>
            </Link>
            <Link
              href="/analytics"
              className="flex flex-col items-center justify-center p-6 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"
            >
              <BarChart3 className="w-8 h-8 text-orange-600 mb-2" />
              <span className="font-medium text-orange-700">View Analytics</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Week Summary */}
      <div className="bg-gradient-to-r from-pickle-600 to-pickle-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold opacity-90">Weekly Summary</h2>
            <p className="text-3xl font-bold mt-2">
              {weekLabels} labels · ${(weekSpent / 100).toFixed(2)}
            </p>
            <p className="mt-1 opacity-75">
              Projected UPS Invoice: ${(projected / 100).toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-75">Avg. per label</p>
            <p className="text-2xl font-bold">
              ${weekLabels > 0 ? (weekSpent / weekLabels / 100).toFixed(2) : '0.00'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
