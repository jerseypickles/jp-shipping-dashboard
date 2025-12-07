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
  Clock,
  BarChart3,
  Bell,
  Mail,
  CheckCircle,
  AlertCircle,
  Eye,
  Loader2,
  XCircle
} from 'lucide-react'
import { 
  getDashboard, 
  getWalletSummary, 
  getFulfillmentStatus,
  getNotificationStatus,
  getNotificationStats,
  getNotificationLogs,
  getBatchNotificationStatus
} from '@/lib/api'

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

interface NotificationStats {
  overview: {
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    failed: number;
  };
}

interface NotificationLog {
  _id: string;
  type: string;
  orderNumber: string;
  recipientName: string;
  status: string;
  createdAt: string;
}

interface BatchNotificationStatus {
  hasBatch: boolean;
  timestamp?: string;
  total?: number;
  sent?: number;
  failed?: number;
  inProgress?: boolean;
  orders?: string[];
  failedOrders?: Array<{ orderNumber: string; reason: string }>;
  minutesAgo?: number;
  summary?: string;
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
  color?: 'gray' | 'green' | 'blue' | 'yellow' | 'red' | 'purple';
  href?: string;
}) {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
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
  const [notifStatus, setNotifStatus] = useState<{ enabled: boolean } | null>(null)
  const [notifStats, setNotifStats] = useState<NotificationStats | null>(null)
  const [recentNotifs, setRecentNotifs] = useState<NotificationLog[]>([])
  const [batchStatus, setBatchStatus] = useState<BatchNotificationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)
    
    try {
      const [dashboardData, walletData, fulfillmentData, notifStatusData, notifStatsData, notifLogsData, batchStatusData] = await Promise.all([
        getDashboard().catch(() => null),
        getWalletSummary().catch(() => null),
        getFulfillmentStatus().catch(() => null),
        getNotificationStatus().catch(() => ({ enabled: false })),
        getNotificationStats(7).catch(() => null),
        getNotificationLogs({ limit: 5 }).catch(() => ({ logs: [] })),
        getBatchNotificationStatus().catch(() => ({ hasBatch: false })),
      ])
      
      setDashboard(dashboardData)
      setWallet(walletData)
      setFulfillment(fulfillmentData)
      setNotifStatus(notifStatusData)
      setNotifStats(notifStatsData)
      setRecentNotifs(notifLogsData?.logs || [])
      setBatchStatus(batchStatusData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Poll batch status if in progress
  useEffect(() => {
    if (batchStatus?.inProgress) {
      const interval = setInterval(async () => {
        try {
          const status = await getBatchNotificationStatus()
          setBatchStatus(status)
          
          // Stop polling when done
          if (!status.inProgress) {
            clearInterval(interval)
            // Reload notifications
            const notifLogsData = await getNotificationLogs({ limit: 5 })
            setRecentNotifs(notifLogsData?.logs || [])
          }
        } catch (e) {
          // Ignore errors during polling
        }
      }, 2000)
      
      return () => clearInterval(interval)
    }
  }, [batchStatus?.inProgress])

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
  
  // Notification stats
  const notifSent = notifStats?.overview?.sent || 0
  const notifDelivered = notifStats?.overview?.delivered || 0
  const openRate = notifDelivered > 0 
    ? ((notifStats?.overview?.opened || 0) / notifDelivered * 100).toFixed(0) 
    : '0'

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

      {/* Batch Notification Status Banner */}
      {batchStatus?.hasBatch && batchStatus.minutesAgo !== undefined && batchStatus.minutesAgo < 60 && (
        <div className={`mb-6 p-4 rounded-lg border flex items-center justify-between ${
          batchStatus.inProgress 
            ? 'bg-blue-50 border-blue-200' 
            : batchStatus.failed && batchStatus.failed > 0
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center gap-3">
            {batchStatus.inProgress ? (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            ) : batchStatus.failed && batchStatus.failed > 0 ? (
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
            <div>
              <p className={`font-medium ${
                batchStatus.inProgress 
                  ? 'text-blue-800' 
                  : batchStatus.failed && batchStatus.failed > 0
                  ? 'text-yellow-800'
                  : 'text-green-800'
              }`}>
                {batchStatus.inProgress 
                  ? 'Sending batch notifications...' 
                  : 'Last batch notifications'}
              </p>
              <p className={`text-sm ${
                batchStatus.inProgress 
                  ? 'text-blue-600' 
                  : batchStatus.failed && batchStatus.failed > 0
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}>
                {batchStatus.summary}
                {!batchStatus.inProgress && batchStatus.failed && batchStatus.failed > 0 && (
                  <span> · {batchStatus.failed} failed</span>
                )}
                {!batchStatus.inProgress && (
                  <span> · {batchStatus.minutesAgo} min ago</span>
                )}
              </p>
            </div>
          </div>
          
          {/* Show recent orders from batch */}
          {batchStatus.orders && batchStatus.orders.length > 0 && !batchStatus.inProgress && (
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Recent orders:</p>
              <p className="text-sm font-mono text-gray-700">
                {batchStatus.orders.slice(-5).join(', ')}
                {batchStatus.orders.length > 5 && '...'}
              </p>
            </div>
          )}
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
          title="Emails Sent"
          value={notifSent}
          subtitle={`${openRate}% open rate`}
          icon={Mail}
          color="purple"
          href="/notifications"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Today's Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Today&apos;s Activity</h2>
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
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                fulfillment?.level === 'normal' ? 'bg-green-100 text-green-800' :
                fulfillment?.level === 'busy' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
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
              className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
            >
              <Package className="w-7 h-7 text-green-600 mb-2" />
              <span className="font-medium text-green-700 text-sm">Ship Orders</span>
            </Link>
            <Link
              href="/labels"
              className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <Printer className="w-7 h-7 text-blue-600 mb-2" />
              <span className="font-medium text-blue-700 text-sm">Print Labels</span>
            </Link>
            <Link
              href="/shipments"
              className="flex flex-col items-center justify-center p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
            >
              <Truck className="w-7 h-7 text-purple-600 mb-2" />
              <span className="font-medium text-purple-700 text-sm">Shipments</span>
            </Link>
            <Link
              href="/analytics"
              className="flex flex-col items-center justify-center p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"
            >
              <BarChart3 className="w-7 h-7 text-orange-600 mb-2" />
              <span className="font-medium text-orange-700 text-sm">Analytics</span>
            </Link>
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Emails</h2>
            <Link href="/notifications" className="text-sm text-pickle-600 hover:text-pickle-700 font-medium">
              View all
            </Link>
          </div>
          
          {!notifStatus?.enabled ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="p-3 bg-yellow-100 rounded-full mb-3">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <p className="text-sm text-gray-600 mb-2">Resend not configured</p>
              <Link 
                href="/notifications" 
                className="text-sm text-pickle-600 hover:text-pickle-700 font-medium"
              >
                Configure now →
              </Link>
            </div>
          ) : recentNotifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="p-3 bg-gray-100 rounded-full mb-3">
                <Mail className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No emails sent yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentNotifs.map(notif => (
                <div key={notif._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                      notif.status === 'delivered' || notif.status === 'opened' 
                        ? 'bg-green-100' 
                        : notif.status === 'failed' 
                        ? 'bg-red-100' 
                        : 'bg-blue-100'
                    }`}>
                      {notif.status === 'delivered' || notif.status === 'opened' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : notif.status === 'failed' ? (
                        <XCircle className="w-4 h-4 text-red-600" />
                      ) : (
                        <Mail className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notif.orderNumber}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {notif.recipientName}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                    notif.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    notif.status === 'opened' ? 'bg-purple-100 text-purple-700' :
                    notif.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {notif.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Week Summary */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white">
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