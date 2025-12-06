'use client'

import { useState, useEffect } from 'react'
import { 
  Bell, 
  Settings, 
  Mail, 
  History,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  Truck,
  MapPin,
  RotateCcw,
  Eye,
  Send,
  Search,
  BarChart3,
  Edit3,
  X,
  Clock,
  MousePointer
} from 'lucide-react'
import {
  getNotificationStatus,
  getNotificationSettings,
  updateNotificationSettings,
  getNotificationTemplates,
  updateNotificationTemplate,
  toggleNotificationTemplate,
  getNotificationLogs,
  getNotificationStats,
  seedNotificationTemplates,
  sendTestNotification,
  previewNotification
} from '@/lib/api'

// ========================================
// TYPES
// ========================================

interface NotificationSettings {
  sender: {
    fromName: string;
    fromEmail: string;
    replyTo: string;
  };
  branding: {
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    footerText: string;
  };
  socialLinks: {
    instagram: string;
    facebook: string;
    twitter: string;
    website: string;
  };
  defaults: {
    autoSendOnLabel: boolean;
    includeItemImages: boolean;
    includeOrderTotal: boolean;
  };
  globalEnabled: boolean;
}

interface NotificationTemplate {
  _id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  trigger: string;
  subject: string;
  preheader: string;
  contentBlocks: {
    header: boolean;
    greeting: boolean;
    trackingBox: boolean;
    itemsList: boolean;
    shippingAddress: boolean;
    ctaButton: boolean;
    reviewRequest: boolean;
    reorderButton: boolean;
    supportInfo: boolean;
  };
  customMessage: string;
  ctaButton: {
    text: string;
    url: string;
  };
  stats: {
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalFailed: number;
    lastSentAt?: string;
  };
}

interface NotificationLog {
  _id: string;
  type: string;
  orderId: string;
  orderNumber: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  status: string;
  trackingNumber?: string;
  error?: string;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
}

interface Stats {
  overview: {
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
  };
  byType: Record<string, { sent: number; delivered: number; opened: number; clicked: number }>;
  byDay: Array<{ date: string; sent: number; delivered: number; opened: number }>;
}

// ========================================
// CONSTANTS
// ========================================

const tabs = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'templates', label: 'Templates', icon: Mail },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'history', label: 'History', icon: History },
]

const templateIcons: Record<string, any> = {
  order_shipped: Package,
  out_for_delivery: Truck,
  delivered: CheckCircle,
  delivery_exception: AlertCircle,
  delivery_attempt_failed: RotateCcw,
  address_issue: MapPin,
}

const templateColors: Record<string, string> = {
  order_shipped: 'bg-blue-100 text-blue-600',
  out_for_delivery: 'bg-purple-100 text-purple-600',
  delivered: 'bg-green-100 text-green-600',
  delivery_exception: 'bg-red-100 text-red-600',
  delivery_attempt_failed: 'bg-orange-100 text-orange-600',
  address_issue: 'bg-yellow-100 text-yellow-600',
}

const statusColors: Record<string, string> = {
  queued: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  delivered: 'bg-green-100 text-green-700',
  opened: 'bg-purple-100 text-purple-700',
  clicked: 'bg-indigo-100 text-indigo-700',
  failed: 'bg-red-100 text-red-700',
  bounced: 'bg-orange-100 text-orange-700',
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [serviceEnabled, setServiceEnabled] = useState(false)
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Modals
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null)
  const [testEmailModal, setTestEmailModal] = useState<{ open: boolean; type: string }>({ open: false, type: '' })
  const [previewModal, setPreviewModal] = useState<{ open: boolean; html: string; subject: string }>({ open: false, html: '', subject: '' })
  
  // Filters for history
  const [logFilters, setLogFilters] = useState({
    type: '',
    status: '',
    search: ''
  })
  const [logsPage, setLogsPage] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)

  // Load initial data
  async function loadData() {
    setLoading(true)
    setError(null)
    
    try {
      const statusRes = await getNotificationStatus()
      setServiceEnabled(statusRes.enabled)
      
      const [settingsRes, templatesRes, logsRes, statsRes] = await Promise.all([
        getNotificationSettings().catch(() => null),
        getNotificationTemplates().catch(() => ({ templates: [] })),
        getNotificationLogs({ limit: 20 }).catch(() => ({ logs: [], total: 0 })),
        getNotificationStats(7).catch(() => null)
      ])
      
      if (settingsRes?.settings) setSettings(settingsRes.settings)
      if (templatesRes?.templates) setTemplates(templatesRes.templates)
      if (logsRes?.logs) {
        setLogs(logsRes.logs)
        setTotalLogs(logsRes.total || logsRes.logs.length)
      }
      if (statsRes) setStats(statsRes)
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Load more logs
  async function loadLogs(page = 1) {
    try {
      const res = await getNotificationLogs({
        type: logFilters.type || undefined,
        status: logFilters.status || undefined,
        limit: 20,
        skip: (page - 1) * 20
      })
      setLogs(res.logs || [])
      setTotalLogs(res.total || 0)
      setLogsPage(page)
    } catch (err: any) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Save settings
  async function handleSaveSettings() {
    if (!settings) return
    
    setSaving(true)
    setError(null)
    setSuccess(null)
    
    try {
      await updateNotificationSettings(settings)
      setSuccess('Settings saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Toggle template
  async function handleToggleTemplate(type: string) {
    try {
      const result = await toggleNotificationTemplate(type)
      setTemplates(prev => prev.map(t => 
        t.type === type ? { ...t, enabled: result.enabled } : t
      ))
      setSuccess(`Template ${result.enabled ? 'enabled' : 'disabled'}`)
      setTimeout(() => setSuccess(null), 2000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Save template
  async function handleSaveTemplate() {
    if (!editingTemplate) return
    
    setSaving(true)
    try {
      await updateNotificationTemplate(editingTemplate.type, editingTemplate)
      setTemplates(prev => prev.map(t => 
        t.type === editingTemplate.type ? editingTemplate : t
      ))
      setEditingTemplate(null)
      setSuccess('Template saved!')
      setTimeout(() => setSuccess(null), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Seed default templates
  async function handleSeedTemplates() {
    try {
      const result = await seedNotificationTemplates()
      setTemplates(result.templates)
      setSuccess('Default templates created!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Send test email
  async function handleSendTest(type: string, email: string) {
    try {
      await sendTestNotification(type, email)
      setTestEmailModal({ open: false, type: '' })
      setSuccess('Test email sent!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Preview template
  async function handlePreview(type: string) {
    try {
      const result = await previewNotification(type, {
        orderNumber: 'JP-12345',
        trackingNumber: '1Z999AA10123456784',
        customer: { name: 'John Smith', email: 'test@example.com' },
        carrier: 'UPS',
        service: 'Ground',
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      })
      // Backend returns { success, preview: { subject, html, ... } }
      const preview = result.preview || result
      setPreviewModal({ open: true, html: preview.html, subject: preview.subject })
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (logFilters.search) {
      const search = logFilters.search.toLowerCase()
      if (!log.orderNumber?.toLowerCase().includes(search) &&
          !log.recipientEmail?.toLowerCase().includes(search) &&
          !log.recipientName?.toLowerCase().includes(search)) {
        return false
      }
    }
    return true
  })

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">Manage email notifications for shipments</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            serviceEnabled 
              ? 'bg-green-100 text-green-700' 
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {serviceEnabled ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Resend Connected
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                Not Configured
              </>
            )}
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {success}
        </div>
      )}

      {!serviceEnabled && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Resend API Key Required</p>
              <p className="text-sm text-yellow-700 mt-1">
                Configure your Resend API key in Heroku to enable email sending:
              </p>
              <code className="block mt-2 text-xs bg-yellow-100 px-3 py-2 rounded font-mono">
                heroku config:set RESEND_API_KEY=re_xxxxxxxxxx
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-pickle-600 text-pickle-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab stats={stats} templates={templates} />
      )}
      
      {activeTab === 'templates' && (
        <TemplatesTab 
          templates={templates} 
          onToggle={handleToggleTemplate}
          onEdit={setEditingTemplate}
          onPreview={handlePreview}
          onTest={(type) => setTestEmailModal({ open: true, type })}
          onSeed={handleSeedTemplates}
          serviceEnabled={serviceEnabled}
        />
      )}
      
      {activeTab === 'settings' && settings && (
        <SettingsTab 
          settings={settings} 
          onChange={setSettings}
          onSave={handleSaveSettings}
          saving={saving}
        />
      )}
      
      {activeTab === 'history' && (
        <HistoryTab 
          logs={filteredLogs}
          filters={logFilters}
          onFilterChange={(f) => { setLogFilters(f); loadLogs(1); }}
          page={logsPage}
          totalPages={Math.ceil(totalLogs / 20)}
          onPageChange={loadLogs}
        />
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <TemplateEditModal
          template={editingTemplate}
          onChange={setEditingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => setEditingTemplate(null)}
          saving={saving}
        />
      )}

      {/* Test Email Modal */}
      {testEmailModal.open && (
        <TestEmailModal
          type={testEmailModal.type}
          onSend={handleSendTest}
          onClose={() => setTestEmailModal({ open: false, type: '' })}
        />
      )}

      {/* Preview Modal */}
      {previewModal.open && (
        <PreviewModal
          subject={previewModal.subject}
          html={previewModal.html}
          onClose={() => setPreviewModal({ open: false, html: '', subject: '' })}
        />
      )}
    </div>
  )
}

// ========================================
// OVERVIEW TAB
// ========================================

function OverviewTab({ stats, templates }: { stats: Stats | null; templates: NotificationTemplate[] }) {
  const overview = stats?.overview || {
    total: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0
  }
  
  const deliveryRate = overview.sent > 0 
    ? ((overview.delivered / overview.sent) * 100).toFixed(1) 
    : '0'
  
  const openRate = overview.delivered > 0 
    ? ((overview.opened / overview.delivered) * 100).toFixed(1) 
    : '0'
  
  const clickRate = overview.opened > 0
    ? ((overview.clicked / overview.opened) * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Send className="w-4 h-4" />
            <span className="text-sm">Sent</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{overview.sent}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Delivered</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{overview.delivered}</p>
          <p className="text-xs text-gray-500 mt-1">{deliveryRate}% rate</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Eye className="w-4 h-4" />
            <span className="text-sm">Opened</span>
          </div>
          <p className="text-3xl font-bold text-blue-600">{overview.opened}</p>
          <p className="text-xs text-gray-500 mt-1">{openRate}% rate</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <MousePointer className="w-4 h-4" />
            <span className="text-sm">Clicked</span>
          </div>
          <p className="text-3xl font-bold text-purple-600">{overview.clicked}</p>
          <p className="text-xs text-gray-500 mt-1">{clickRate}% rate</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <XCircle className="w-4 h-4" />
            <span className="text-sm">Failed</span>
          </div>
          <p className="text-3xl font-bold text-red-600">{overview.failed}</p>
        </div>
      </div>

      {/* Template Performance Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="pb-3 font-medium">Template</th>
                <th className="pb-3 font-medium text-center">Status</th>
                <th className="pb-3 font-medium text-right">Sent</th>
                <th className="pb-3 font-medium text-right">Delivered</th>
                <th className="pb-3 font-medium text-right">Opened</th>
                <th className="pb-3 font-medium text-right">Open Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {templates.map(template => {
                const Icon = templateIcons[template.type] || Mail
                const tOpenRate = template.stats.totalDelivered > 0
                  ? ((template.stats.totalOpened / template.stats.totalDelivered) * 100).toFixed(1)
                  : '0'
                
                return (
                  <tr key={template._id}>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${templateColors[template.type] || 'bg-gray-100 text-gray-600'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{template.name}</p>
                          <p className="text-xs text-gray-500">{template.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        template.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {template.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 text-right font-medium">{template.stats.totalSent}</td>
                    <td className="py-3 text-right font-medium text-green-600">{template.stats.totalDelivered}</td>
                    <td className="py-3 text-right font-medium text-blue-600">{template.stats.totalOpened}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${tOpenRate}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{tOpenRate}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          {templates.length === 0 && (
            <p className="text-center text-gray-500 py-8">No templates configured yet</p>
          )}
        </div>
      </div>

      {/* Activity Chart */}
      {stats?.byDay && stats.byDay.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Last 7 Days</h3>
          <div className="flex items-end justify-between h-32 gap-2">
            {stats.byDay.map((day, i) => {
              const maxSent = Math.max(...stats.byDay.map(d => d.sent), 1)
              const height = (day.sent / maxSent) * 100
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500 mb-1">{day.sent}</span>
                  <div 
                    className="w-full bg-pickle-500 rounded-t transition-all hover:bg-pickle-600"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-xs text-gray-500">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ========================================
// TEMPLATES TAB
// ========================================

function TemplatesTab({ 
  templates, 
  onToggle,
  onEdit,
  onPreview,
  onTest,
  onSeed,
  serviceEnabled
}: { 
  templates: NotificationTemplate[]
  onToggle: (type: string) => void
  onEdit: (template: NotificationTemplate) => void
  onPreview: (type: string) => void
  onTest: (type: string) => void
  onSeed: () => void
  serviceEnabled: boolean
}) {
  if (templates.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Templates Yet</h3>
        <p className="text-gray-500 mb-4">Create default notification templates to get started</p>
        <button
          onClick={onSeed}
          className="px-4 py-2 bg-pickle-600 text-white rounded-lg hover:bg-pickle-700"
        >
          Create Default Templates
        </button>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {templates.map(template => {
        const Icon = templateIcons[template.type] || Mail
        
        return (
          <div 
            key={template._id}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className={`p-3 rounded-xl flex-shrink-0 ${
                  template.enabled 
                    ? templateColors[template.type] || 'bg-gray-100 text-gray-600'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      template.trigger === 'auto_after_label' 
                        ? 'bg-blue-100 text-blue-700'
                        : template.trigger === 'ups_webhook'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {template.trigger === 'auto_after_label' ? '⚡ Auto' : 
                       template.trigger === 'ups_webhook' ? '🔗 Webhook' : '👆 Manual'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                    <span className="text-gray-500">Subject:</span>{' '}
                    <span className="text-gray-700">{template.subject}</span>
                  </div>
                  
                  {/* Stats row */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Send className="w-3 h-3" />
                      {template.stats.totalSent} sent
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      {template.stats.totalDelivered} delivered
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3 text-blue-500" />
                      {template.stats.totalOpened} opened
                    </span>
                    {template.stats.lastSentAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last: {new Date(template.stats.lastSentAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onPreview(template.type)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Preview"
                >
                  <Eye className="w-5 h-5" />
                </button>
                {serviceEnabled && (
                  <button
                    onClick={() => onTest(template.type)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Send Test"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => onEdit(template)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Edit"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onToggle(template.type)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    template.enabled ? 'bg-pickle-600' : 'bg-gray-200'
                  }`}
                  title={template.enabled ? 'Disable' : 'Enable'}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                    template.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ========================================
// SETTINGS TAB
// ========================================

function SettingsTab({ 
  settings, 
  onChange, 
  onSave,
  saving 
}: { 
  settings: NotificationSettings
  onChange: (settings: NotificationSettings) => void
  onSave: () => void
  saving: boolean
}) {
  const updateSender = (field: string, value: string) => {
    onChange({ ...settings, sender: { ...settings.sender, [field]: value } })
  }
  
  const updateBranding = (field: string, value: string) => {
    onChange({ ...settings, branding: { ...settings.branding, [field]: value } })
  }
  
  const updateSocial = (field: string, value: string) => {
    onChange({ ...settings, socialLinks: { ...settings.socialLinks, [field]: value } })
  }
  
  const updateDefaults = (field: string, value: boolean) => {
    onChange({ 
      ...settings, 
      defaults: { ...settings.defaults, [field]: value } 
    })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Auto-Send Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Automation</h3>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
            <div>
              <p className="font-medium text-gray-900">Auto-send on Label Creation</p>
              <p className="text-sm text-gray-500">Automatically send shipping notification when a label is created</p>
            </div>
            <button
              type="button"
              onClick={() => updateDefaults('autoSendOnLabel', !settings.defaults?.autoSendOnLabel)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.defaults?.autoSendOnLabel ? 'bg-pickle-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                settings.defaults?.autoSendOnLabel ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </label>
          
          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
            <div>
              <p className="font-medium text-gray-900">Include Item Images</p>
              <p className="text-sm text-gray-500">Show product images in notification emails</p>
            </div>
            <button
              type="button"
              onClick={() => updateDefaults('includeItemImages', !settings.defaults?.includeItemImages)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.defaults?.includeItemImages ? 'bg-pickle-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                settings.defaults?.includeItemImages ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </label>
        </div>
      </div>
      
      {/* Sender Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sender Information</h3>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
            <input
              type="text"
              value={settings.sender.fromName}
              onChange={(e) => updateSender('fromName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
              placeholder="Jersey Pickles"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
            <input
              type="email"
              value={settings.sender.fromEmail}
              onChange={(e) => updateSender('fromEmail', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
              placeholder="shipping@jerseypickles.com"
            />
            <p className="text-xs text-gray-500 mt-1">Must be verified in Resend</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reply-To Email</label>
            <input
              type="email"
              value={settings.sender.replyTo}
              onChange={(e) => updateSender('replyTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
              placeholder="support@jerseypickles.com"
            />
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Branding</h3>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
            <input
              type="url"
              value={settings.branding.logoUrl}
              onChange={(e) => updateBranding('logoUrl', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
              placeholder="https://jerseypickles.com/logo.png"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.branding.primaryColor}
                  onChange={(e) => updateBranding('primaryColor', e.target.value)}
                  className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.branding.primaryColor}
                  onChange={(e) => updateBranding('primaryColor', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500 font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.branding.secondaryColor}
                  onChange={(e) => updateBranding('secondaryColor', e.target.value)}
                  className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.branding.secondaryColor}
                  onChange={(e) => updateBranding('secondaryColor', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500 font-mono text-sm"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Footer Text</label>
            <textarea
              value={settings.branding.footerText}
              onChange={(e) => updateBranding('footerText', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
              placeholder="© 2024 Jersey Pickles. All rights reserved."
            />
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Links</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input
              type="url"
              value={settings.socialLinks.website}
              onChange={(e) => updateSocial('website', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
              placeholder="https://jerseypickles.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
            <input
              type="url"
              value={settings.socialLinks.instagram}
              onChange={(e) => updateSocial('instagram', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
              placeholder="https://instagram.com/jerseypickles"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
            <input
              type="url"
              value={settings.socialLinks.facebook}
              onChange={(e) => updateSocial('facebook', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
              placeholder="https://facebook.com/jerseypickles"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Twitter/X</label>
            <input
              type="url"
              value={settings.socialLinks.twitter}
              onChange={(e) => updateSocial('twitter', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
              placeholder="https://x.com/jerseypickles"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-pickle-600 text-white rounded-lg hover:bg-pickle-700 disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ========================================
// HISTORY TAB
// ========================================

function HistoryTab({ 
  logs, 
  filters,
  onFilterChange,
  page,
  totalPages,
  onPageChange
}: { 
  logs: NotificationLog[]
  filters: { type: string; status: string; search: string }
  onFilterChange: (filters: { type: string; status: string; search: string }) => void
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            placeholder="Search by order #, email, or name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
          />
        </div>
        <select
          value={filters.type}
          onChange={(e) => onFilterChange({ ...filters, type: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
        >
          <option value="">All Types</option>
          <option value="order_shipped">Shipped</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="delivery_exception">Exception</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
        >
          <option value="">All Status</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="opened">Opened</option>
          <option value="clicked">Clicked</option>
          <option value="failed">Failed</option>
          <option value="bounced">Bounced</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipient
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opened
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(log => {
                const Icon = templateIcons[log.type] || Mail
                
                return (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-gray-900">{log.orderNumber}</span>
                        {log.trackingNumber && (
                          <p className="text-xs text-gray-500 font-mono">{log.trackingNumber}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${templateColors[log.type] || 'bg-gray-100 text-gray-600'}`}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-gray-600 capitalize">
                          {log.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-gray-900">{log.recipientName}</p>
                        <p className="text-xs text-gray-500">{log.recipientEmail}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[log.status] || 'bg-gray-100 text-gray-700'
                      }`}>
                        {log.status}
                      </span>
                      {log.error && (
                        <p className="text-xs text-red-500 mt-0.5 max-w-[150px] truncate" title={log.error}>
                          {log.error}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {log.sentAt 
                        ? new Date(log.sentAt).toLocaleString()
                        : new Date(log.createdAt).toLocaleString()
                      }
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {log.openedAt ? new Date(log.openedAt).toLocaleString() : '-'}
                    </td>
                  </tr>
                )
              })}
              
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <Mail className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No notifications found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ========================================
// MODALS
// ========================================

function TemplateEditModal({
  template,
  onChange,
  onSave,
  onClose,
  saving
}: {
  template: NotificationTemplate
  onChange: (template: NotificationTemplate) => void
  onSave: () => void
  onClose: () => void
  saving: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit Template: {template.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
            <input
              type="text"
              value={template.subject}
              onChange={(e) => onChange({ ...template, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Variables: {'{{order_number}}'}, {'{{tracking_number}}'}, {'{{customer_name}}'}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preheader Text</label>
            <input
              type="text"
              value={template.preheader || ''}
              onChange={(e) => onChange({ ...template, preheader: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
              placeholder="Preview text shown in inbox..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Custom Message</label>
            <textarea
              value={template.customMessage || ''}
              onChange={(e) => onChange({ ...template, customMessage: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
              placeholder="Your order is on its way! {{customer_name}}, thank you for shopping with us..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Content Blocks</label>
            <div className="grid grid-cols-2 gap-2">
              {template.contentBlocks && Object.entries(template.contentBlocks).map(([key, enabled]) => (
                <label key={key} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={enabled as boolean}
                    onChange={(e) => onChange({
                      ...template,
                      contentBlocks: { ...template.contentBlocks, [key]: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-pickle-600 focus:ring-pickle-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button Text</label>
              <input
                type="text"
                value={template.ctaButton?.text || ''}
                onChange={(e) => onChange({
                  ...template,
                  ctaButton: { ...template.ctaButton, text: e.target.value, url: template.ctaButton?.url || '' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
                placeholder="Track My Order"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button URL</label>
              <input
                type="text"
                value={template.ctaButton?.url || ''}
                onChange={(e) => onChange({
                  ...template,
                  ctaButton: { text: template.ctaButton?.text || '', url: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
                placeholder="{{tracking_url}}"
              />
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-pickle-600 text-white rounded-lg hover:bg-pickle-700 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Save Template
          </button>
        </div>
      </div>
    </div>
  )
}

function TestEmailModal({
  type,
  onSend,
  onClose
}: {
  type: string
  onSend: (type: string, email: string) => void
  onClose: () => void
}) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!email) return
    setSending(true)
    await onSend(type, email)
    setSending(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Send Test Email</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Send a test <span className="font-medium capitalize">{type.replace(/_/g, ' ')}</span> email to verify your template.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
              placeholder="your@email.com"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!email || sending}
            className="flex items-center gap-2 px-4 py-2 bg-pickle-600 text-white rounded-lg hover:bg-pickle-700 disabled:opacity-50"
          >
            {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Test
          </button>
        </div>
      </div>
    </div>
  )
}

function PreviewModal({
  subject,
  html,
  onClose
}: {
  subject: string
  html: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Subject</p>
            <h2 className="text-lg font-semibold text-gray-900">{subject}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <div className="max-w-[600px] mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
            <iframe
              srcDoc={html}
              className="w-full h-[600px] border-0"
              title="Email Preview"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}